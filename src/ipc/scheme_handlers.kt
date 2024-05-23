// vim: set sw=2:
package socket.runtime.ipc

import java.io.PipedInputStream
import java.io.PipedOutputStream
import java.lang.Thread
import java.util.concurrent.Semaphore

import kotlin.concurrent.thread

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse

import socket.runtime.core.console
import socket.runtime.ipc.Message

open class SchemeHandlers (val bridge: Bridge) {
  open class Request (val bridge: Bridge, val request: WebResourceRequest) {
    val response = Response(this)
    val body: ByteArray? by lazy {
      try {
        val seq = this.request.url.getQueryParameter("seq")

        if (seq != null && this.bridge.buffers.contains(seq)) {
          val buffer = this.bridge.buffers[seq]
          this.bridge.buffers.remove(seq)
          buffer
        } else {
          null
        }
      } catch (_: Exception) {
        null
      }
    }

    fun getScheme (): String {
      val url = this.request.url
      if (
        (url.scheme == "https" || url.scheme == "http") &&
        url.host == "__BUNDLE_IDENTIFIER__"
      ) {
        return "socket"
      }

      return this.request.url.scheme ?: ""
    }

    fun getMethod (): String {
      return this.request.method ?: ""
    }

    fun getHostname (): String {
      return this.request.url.host ?: ""
    }

    fun getPathname (): String {
      return this.request.url.path ?: ""
    }

    fun getQuery (): String {
      return this.request.url.query ?: ""
    }

    fun getHeaders (): String {
      var headers = ""
      for (entry in request.requestHeaders) {
        headers += "${entry.key}: ${entry.value}\n"
      }
      return headers
    }

    fun getUrl (): String {
      return this.request.url.toString().replace("https:", "socket:")
    }

    fun getWebResourceResponse (): WebResourceResponse? {
      return this.response.response
    }
  }

  open class Response (val request: Request) {
    val stream = PipedOutputStream()
    var mimeType = "application/octet-stream"
    val response = WebResourceResponse(
      mimeType,
      null,
      null
    )

    val headers = mutableMapOf<String, String>()
    var pendingWrites = 0

    fun setStatus (statusCode: Int, statusText: String) {
      val headers = this.headers
      val mimeType = this.mimeType

      this.response.apply {
        setStatusCodeAndReasonPhrase(statusCode, statusText)
        setResponseHeaders(headers)
        setMimeType(mimeType)
      }
    }

    fun setHeader (name: String, value: String) {
      if (name.lowercase() == "content-type") {
        this.mimeType = value
      } else {
        this.headers += mapOf(name to value)
      }
    }

    fun write (bytes: ByteArray) {
      val stream = this.stream
      console.log("begin response write")
      if (this.response.data == null) {
        try {
          this.response.data = PipedInputStream(this.stream)
        } catch (err: Exception) {
          console.log("stream.connect error: ${err.toString()}")
        }
      }
      try {
        this.pendingWrites++
        stream.write(bytes, 0, bytes.size)
      } catch (err: Exception) {
        console.log("stream.write error: ${err.toString()}")
        if (!err.message.toString().contains("closed")) {
          console.error("socket.runtime.ipc.SchemeHandlers.Response: ${err.toString()}")
        }
      }

      this.pendingWrites--
      console.log("end response write")
    }

    fun write (string: String) {
      this.write(string.toByteArray())
    }

    fun finish () {
      val stream = this.stream
      thread {
        while (this.pendingWrites > 0) {
          Thread.sleep(4)
        }

        stream.flush()
        stream.close()
        console.log("response closed")
      }
    }
  }

  fun handleRequest (webResourceRequest: WebResourceRequest): WebResourceResponse? {
    val request = Request(this.bridge, webResourceRequest)

    if (this.handleRequest(this.bridge.index, request)) {
      return request.getWebResourceResponse()
    }

    return null
  }

  @Throws(Exception::class)
  external fun handleRequest (index: Int, request: Request): Boolean
}