#include "extension.hh"

void sapi_ipc_router_map (
  sapi_context_t* ctx,
  const char* name,
  sapi_ipc_router_message_callback_t callback,
  const void* data
) {
  if (
    ctx == nullptr ||
    ctx->router == nullptr ||
    ctx->state > SSC::Extension::Context::State::Init
  ) {
    return;
  }

  if (!ctx->isAllowed("ipc_router_map")) {
    sapi_debug(ctx, "'ipc_router_map' is not allowed.");
    return;
  }

  sapi_context_t context(ctx);
  ctx->router->map(name, [data, callback, context](
    auto& message,
    auto router,
    auto reply
  ) {
    auto ctx = new sapi_context_t(context);
    auto msg = SSC::IPC::Message(
      message.uri,
      true, // decode parameter values AOT in `message.uri`
      message.buffer.bytes,
      message.buffer.size
    );
    ctx->internal = ctx->memory.alloc<SSC::IPC::Router::ReplyCallback>(reply);
    callback(
      ctx,
      (sapi_ipc_message_t*) &msg,
      reinterpret_cast<const sapi_ipc_router_t*>(&router)
    );
  });
}

void sapi_ipc_router_unmap (sapi_context_t* ctx, const char* name) {
  if (ctx == nullptr || ctx->router == nullptr) {
    return;
  }

  if (!ctx->isAllowed("ipc_router_unmap")) {
    sapi_debug(ctx, "'ipc_router_unmap' is not allowed.");
    return;
  }

  ctx->router->unmap(name);
}

uint64_t sapi_ipc_router_listen (
  sapi_context_t* ctx,
  const char* name,
  sapi_ipc_router_message_callback_t callback,
  const void* data
) {
  if (ctx == nullptr || ctx->router == nullptr || name == nullptr) {
    return 0;
  }

  if (!ctx->isAllowed("ipc_router_listen")) {
    sapi_debug(ctx, "'ipc_router_listen' is not allowed.");
    return 0;
  }

  return ctx->router->listen(name, [data, callback](
    auto& message,
    auto router,
    auto reply
  ) mutable {
    sapi_context_t context;
    context.router = router;
    context.data = data;
    callback(
      &context,
      (sapi_ipc_message_t*)(&message),
      reinterpret_cast<const sapi_ipc_router_t*>(&router)
    );
  });
}

bool sapi_ipc_router_unlisten (
  sapi_context_t* ctx,
  const char* name,
  uint64_t token
) {
  if (ctx == nullptr || ctx->router == nullptr || name == nullptr) {
    return false;
  }

  if (!ctx->isAllowed("ipc_router_unlisten")) {
    sapi_debug(ctx, "'ipc_router_unlisten' is not allowed.");
    return false;
  }

  return ctx->router->unlisten(name, token);
}

bool sapi_ipc_reply (const sapi_ipc_result_t* result) {
  if (result == nullptr) return false;
  if (result->context == nullptr) return false;

  if (!result->context->isAllowed("ipc_router_reply")) {
    sapi_debug(result->context, "'ipc_router_reply' is not allowed.");
    return 0;
  }

  auto success = false;
  auto context = result->context;
  auto internal = context->internal;
  auto fn = reinterpret_cast<SSC::IPC::Router::ReplyCallback*>(internal);

  if (fn != nullptr) {
    if (fn != nullptr && result != nullptr) {
      (*fn)(*result);
      success = true;
    }
  }

  // if retained, then then caller must eventually call `sapi_context_release()`
  if (!context->retained) {
    context->release();
    delete context;
  }

  return success;
}

bool sapi_ipc_send_bytes (
  sapi_context_t* ctx,
  const char* seq,
  const unsigned int size,
  const unsigned char* bytes,
  const char* headers
) {
  if (ctx == nullptr || ctx->router == nullptr || bytes == nullptr || size == 0) {
    return false;
  }
  auto body = new char[size]{0};
  memcpy(body, bytes, size);
  return ctx->router->send(
    seq == nullptr || SSC::String(seq) == "" ? "-1" : seq,
    "",
    SSC::Post { 0, 0, body, size, headers ? headers : "" }
  );
}

bool sapi_ipc_send_json (
  sapi_context_t* ctx,
  const char* seq,
  sapi_json_any_t* json
) {
  SSC::JSON::Any value = nullptr;

  if (ctx == nullptr || ctx->router == nullptr || json == nullptr) {
    return false;
  }

  if (json == nullptr) {
    value = nullptr;
  } else if (json->type > SSC::JSON::Type::Any) {
    if (json->isObject()) {
      auto object = reinterpret_cast<const SSC::JSON::Object*>(json);
      value = SSC::JSON::Object(object->data);
    } else if (json->isArray()) {
      auto array = reinterpret_cast<const SSC::JSON::Array*>(json);
      value = SSC::JSON::Array(array->data);
    } else if (json->isString()) {
      auto string = reinterpret_cast<const SSC::JSON::String*>(json);
      value = SSC::JSON::String(string->data);
    } else if (json->isBoolean()) {
      auto boolean = reinterpret_cast<const SSC::JSON::Boolean*>(json);
      value = SSC::JSON::Boolean(boolean->data);
    } else if (json->isNumber()) {
      auto number = reinterpret_cast<const SSC::JSON::Number*>(json);
      value = SSC::JSON::Number(number->data);
    } else if (json->isRaw()) {
      auto raw = reinterpret_cast<const SSC::JSON::Raw*>(json);
      value = SSC::JSON::Raw(raw->data);
    }
  }

  return ctx->router->send(
    seq == nullptr || SSC::String(seq) == "" ? "-1" : seq,
    value.str(),
    SSC::Post {}
  );
}

bool sapi_ipc_emit (
  sapi_context_t* ctx,
  const char* name,
  const char* data
) {
  return ctx && ctx->router ? ctx->router->emit(name, data) : false;
}

bool sapi_ipc_invoke (
  sapi_context_t* ctx,
  const char* url,
  unsigned int size,
  const char* bytes,
  sapi_ipc_router_result_callback_t callback
) {
  if (ctx == nullptr || ctx->router == nullptr) return false;
  auto uri = SSC::String(url);

  if (!uri.starts_with("ipc://")) {
    uri = "ipc://" + uri;
  }

  return ctx->router->invoke(uri, bytes, size, [ctx, callback](auto result) {
    callback(
      reinterpret_cast<const sapi_ipc_result_t*>(&result),
      reinterpret_cast<const sapi_ipc_router_t*>(&ctx->router)
    );
  });
}

sapi_ipc_result_t* sapi_ipc_result_from_json (
  sapi_context_t* ctx,
  sapi_ipc_message_t* message,
  const sapi_json_any_t* json
) {
  if (ctx == nullptr) return nullptr;
  auto result= ctx->memory.alloc<sapi_ipc_result_t>(ctx);
  result->context = ctx;

  if (json) sapi_ipc_result_set_json(result, json);
  if (message) {
    sapi_ipc_result_set_seq(result, message->seq.c_str());
    sapi_ipc_result_set_message(result, message);
  }

  return result;
}

sapi_ipc_result_t* sapi_ipc_result_create (
  sapi_context_t* ctx,
  sapi_ipc_message_t* message
) {
  if (ctx == nullptr) return nullptr;
  auto result= ctx->memory.alloc<sapi_ipc_result_t>(ctx);
  if (message) {
    sapi_ipc_result_set_seq(result, message->seq.c_str());
    sapi_ipc_result_set_message(result, message);
  }
  return result;
}

const int sapi_ipc_message_get_index (const sapi_ipc_message_t* message) {
  return message ? message->index : -1;
}

const char* sapi_ipc_message_get_value (const sapi_ipc_message_t* message) {
  if (message == nullptr || message->value.size() == 0) return nullptr;
  return message->value.c_str();
}

const char* sapi_ipc_message_get_name (const sapi_ipc_message_t* message) {
  if (message == nullptr || message->name.size() == 0) return nullptr;
  return message->name.c_str();
}

const char* sapi_ipc_message_get_seq (const sapi_ipc_message_t* message) {
  if (message == nullptr || message->seq.size() == 0) return nullptr;
  return message->seq.c_str();
}

const char* sapi_ipc_message_get_uri (const sapi_ipc_message_t* message) {
  if (message->uri.size() == 0) return nullptr;
  return message->uri.c_str();
}

const char* sapi_ipc_message_get (
  const sapi_ipc_message_t* message,
  const char* key
) {
  if (!message || !key || !message->args.contains(key)) return nullptr;
  auto& value = message->args.at(key);
  if (value.size() == 0) return nullptr;
  return value.c_str();
}

void sapi_ipc_result_set_seq (sapi_ipc_result_t* result, const char* seq) {
  if (result && seq) {
    result->seq = seq;
  }
}

const char* sapi_ipc_result_get_seq (const sapi_ipc_result_t* result) {
  return result ? result->seq.c_str() : nullptr;
}

void sapi_ipc_result_set_message (
  sapi_ipc_result_t* result,
  sapi_ipc_message_t* message
) {
  if (result && message) {
    result->message = *message;
  }
}

const sapi_ipc_message_t* sapi_ipc_result_get_message (
  const sapi_ipc_result_t* result
) {
  return result
    ? reinterpret_cast<const sapi_ipc_message_t*>(&result->message)
    : nullptr;
}

void sapi_ipc_result_set_json (
  sapi_ipc_result_t* result,
  const sapi_json_any_t* json
) {
  if (result == nullptr) return;
  if (json == nullptr) {
    result->value = nullptr;
  } else if (json->type > SSC::JSON::Type::Any) {
    if (json->isObject()) {
      auto object = reinterpret_cast<const SSC::JSON::Object*>(json);
      result->value = SSC::JSON::Object(object->data);
    } else if (json->isArray()) {
      auto array = reinterpret_cast<const SSC::JSON::Array*>(json);
      result->value = SSC::JSON::Array(array->data);
    } else if (json->isString()) {
      auto string = reinterpret_cast<const SSC::JSON::String*>(json);
      result->value = SSC::JSON::String(string->data);
    } else if (json->isBoolean()) {
      auto boolean = reinterpret_cast<const SSC::JSON::Boolean*>(json);
      result->value = SSC::JSON::Boolean(boolean->data);
    } else if (json->isNumber()) {
      auto number = reinterpret_cast<const SSC::JSON::Number*>(json);
      result->value = SSC::JSON::Number(number->data);
    }
  }
}

const sapi_json_any_t* sapi_ipc_result_get_json (
  const sapi_ipc_result_t* result
) {
  return result
    ? reinterpret_cast<const sapi_json_any_t*>(&result->value)
    : nullptr;
}

void sapi_ipc_result_set_json_data (
  sapi_ipc_result_t* result,
  const sapi_json_any_t* json
) {
  if (result == nullptr) return;
  if (json == nullptr) {
    result->data = nullptr;
  } else if (json->type > SSC::JSON::Type::Any) {
    if (json->isObject()) {
      auto object = reinterpret_cast<const SSC::JSON::Object*>(json);
      result->data = SSC::JSON::Object(object->data);
    } else if (json->isArray()) {
      auto array = reinterpret_cast<const SSC::JSON::Array*>(json);
      result->data = SSC::JSON::Array(array->data);
    } else if (json->isString()) {
      auto string = reinterpret_cast<const SSC::JSON::String*>(json);
      result->data = SSC::JSON::String(string->data);
    } else if (json->isBoolean()) {
      auto boolean = reinterpret_cast<const SSC::JSON::Boolean*>(json);
      result->data = SSC::JSON::Boolean(boolean->data);
    } else if (json->isNumber()) {
      auto number = reinterpret_cast<const SSC::JSON::Number*>(json);
      result->data = SSC::JSON::Number(number->data);
    }
  }
}

const sapi_json_any_t* sapi_ipc_result_get_json_data (
  const sapi_ipc_result_t* result
) {
  return result
    ? reinterpret_cast<const sapi_json_any_t*>(&result->data)
    : nullptr;
}

void sapi_ipc_result_set_json_error (
  sapi_ipc_result_t* result,
  const sapi_json_any_t* json
) {
  if (result == nullptr) return;
  if (json == nullptr) {
    result->err = nullptr;
  } else if (json->type > SSC::JSON::Type::Any) {
    if (json->isObject()) {
      auto object = reinterpret_cast<const SSC::JSON::Object*>(json);
      result->err = SSC::JSON::Object(object->data);
    } else if (json->isArray()) {
      auto array = reinterpret_cast<const SSC::JSON::Array*>(json);
      result->err = SSC::JSON::Array(array->data);
    } else if (json->isString()) {
      auto string = reinterpret_cast<const SSC::JSON::String*>(json);
      result->err = SSC::JSON::String(string->data);
    } else if (json->isBoolean()) {
      auto boolean = reinterpret_cast<const SSC::JSON::Boolean*>(json);
      result->err = SSC::JSON::Boolean(boolean->data);
    } else if (json->isNumber()) {
      auto number = reinterpret_cast<const SSC::JSON::Number*>(json);
      result->err = SSC::JSON::Number(number->data);
    }
  }
}

const sapi_json_any_t* sapi_ipc_result_get_json_error (
  const sapi_ipc_result_t* result
) {
  return result
    ? reinterpret_cast<const sapi_json_any_t*>(&result->err)
    : nullptr;
}

void sapi_ipc_result_set_bytes (
  sapi_ipc_result_t* result,
  const unsigned int size,
  const unsigned char* bytes
) {
  if (result && size && bytes) {
    auto pointer = const_cast<char*>(reinterpret_cast<const char*>(bytes));
    result->post.length = size;
    result->post.body = pointer;
  }
}

const unsigned char* sapi_ipc_result_get_bytes (
  const sapi_ipc_result_t* result
) {
  return result
    ? reinterpret_cast<const unsigned char*>(result->post.body)
    : nullptr;
}

const unsigned int sapi_ipc_result_get_bytes_size (
  const sapi_ipc_result_t* result
) {
  return result ? result->post.length : 0;
}

void sapi_ipc_result_set_header (
  sapi_ipc_result_t* result,
  const char* name,
  const char* value
) {
  if (result && name && value) {
    result->headers.set(name, value);
  }
}

const char* sapi_ipc_result_get_header (
  const sapi_ipc_result_t* result,
  const char* name
) {
  if (result && result->headers.has(name)) {
    return result->headers.get(name).value.string.c_str();
  }

  return nullptr;
}
