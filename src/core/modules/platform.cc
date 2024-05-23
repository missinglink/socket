#include "../process.hh"
#include "../codec.hh"
#include "../core.hh"
#include "../json.hh"
#include "platform.hh"

namespace SSC {
  void CorePlatform::event (
    const String& seq,
    const String& event,
    const String& data,
    const CoreModule::Callback& callback
  ) {
    this->core->dispatchEventLoop([=, this]() {
      // init page
      if (event == "domcontentloaded") {
        Lock lock(this->core->fs.mutex);

        this->wasFirstDOMContentLoadedEventDispatched = true;

        for (const auto& tuple : this->core->fs.descriptors) {
          auto desc = tuple.second;
          if (desc != nullptr) {
            desc->stale = true;
          } else {
            this->core->fs.descriptors.erase(tuple.first);
          }
        }

        #if !SOCKET_RUNTIME_PLATFORM_ANDROID
        for (const auto& tuple : this->core->fs.watchers) {
          auto watcher = tuple.second;
          if (watcher != nullptr) {
            watcher->stop();
          }
        }

        this->core->fs.watchers.clear();
        #endif
      }

      const auto json = JSON::Object::Entries {
        {"source", "platform.event"},
        {"data", JSON::Object {}}
      };

      callback(seq, json, Post{});
    });
  }

  void CorePlatform::notify (
    const String& seq,
    const String& title,
    const String& body,
    const CoreModule::Callback& callback
  ) const {
    #if SOCKET_RUNTIME_PLATFORM_APPLE
      auto center = [UNUserNotificationCenter currentNotificationCenter];
      auto content = [[UNMutableNotificationContent alloc] init];
      content.body = [NSString stringWithUTF8String: body.c_str()];
      content.title = [NSString stringWithUTF8String: title.c_str()];
      content.sound = [UNNotificationSound defaultSound];

      auto trigger = [UNTimeIntervalNotificationTrigger
        triggerWithTimeInterval: 1.0f
                        repeats: NO
      ];

      auto request = [UNNotificationRequest
        requestWithIdentifier: @"LocalNotification"
                      content: content
                      trigger: trigger
      ];

      auto options = (
        UNAuthorizationOptionAlert |
        UNAuthorizationOptionBadge |
        UNAuthorizationOptionSound
      );

      [center requestAuthorizationWithOptions: options
                            completionHandler: ^(BOOL granted, NSError* error)
      {
        #if !__has_feature(objc_arc)
        [content release];
        [trigger release];
        #endif

        if (granted) {
          auto json = JSON::Object::Entries {
            {"source", "platform.notify"},
            {"data", JSON::Object::Entries {}}
          };

          callback(seq, json, Post{});
        } else if (error) {
          [center addNotificationRequest: request
                   withCompletionHandler: ^(NSError* error)
          {
            auto json = JSON::Object {};

            #if !__has_feature(objc_arc)
            [request release];
            #endif

            if (error) {
              json = JSON::Object::Entries {
                {"source", "platform.notify"},
                {"err", JSON::Object::Entries {
                  {"message", [error.debugDescription UTF8String]}
                }}
              };

              debug("Unable to create notification: %@", error.debugDescription);
            } else {
              json = JSON::Object::Entries {
                {"source", "platform.notify"},
                {"data", JSON::Object::Entries {}}
              };
            }

           callback(seq, json, Post{});
          }];
        } else {
          auto json = JSON::Object::Entries {
            {"source", "platform.notify"},
            {"err", JSON::Object::Entries {
              {"message", "Failed to create notification"}
            }}
          };

          callback(seq, json, Post{});
        }

        if (!error || granted) {
          #if !__has_feature(objc_arc)
          [request release];
          #endif
        }
      }];
    #endif
  }

  void CorePlatform::revealFile (
    const String& seq,
    const String& value,
    const CoreModule::Callback& callback
  ) const {
    String errorMessage = "Failed to open external file";
    String pathToFile = decodeURIComponent(value);
    bool success = false;
    auto json = JSON::Object(JSON::Object::Entries {
      {"source", "platform.revealFile"}
    });

    #if SOCKET_RUNTIME_PLATFORM_MACOS
      success = [NSWorkspace.sharedWorkspace
                      selectFile: nil
        inFileViewerRootedAtPath: @(pathToFile.c_str())
      ];
    #elif SOCKET_RUNTIME_PLATFORM_LINUX
      const auto result = exec("xdg-open " + pathToFile);
      success = result.exitCode == 0;
      errorMessage = result.output;
    #elif SOCKET_RUNTIME_PLATFORM_WINDOWS
      const auto result = exec("explorer.exe \"" + pathToFile + "\"");
      success = result.exitCode == 0;
      errorMessage = result.output;
    #endif

    if (!success) {
      json["err"] = JSON::Object::Entries {
        {"message", errorMessage}
      };
    } else {
      json["data"] = JSON::Object {};
    }

    callback(seq, json, Post{});
  }

  void CorePlatform::openExternal (
    const String& seq,
    const String& value,
    const CoreModule::Callback& callback
  ) const {
    #if SOCKET_RUNTIME_PLATFORM_APPLE
      const auto url = [NSURL URLWithString: @(value.c_str())];

      #if SOCKET_RUNTIME_PLATFORM_IOS
        [UIApplication.sharedApplication openURL: url options: @{} completionHandler: ^(BOOL success) {
          auto json = JSON::Object {};

          if (!success) {
            json = JSON::Object::Entries {
              {"source", "platform.openExternal"},
              {"err", JSON::Object::Entries {
                {"message", "Failed to open external URL"}
              }}
            };
          } else {
            json = JSON::Object::Entries {
              {"source", "platform.openExternal"},
              {"data", JSON::Object::Entries {{"url", value}}}
            };
          }

          callback(seq, json, Post{});
        }];
      #else
        auto workspace = [NSWorkspace sharedWorkspace];
        auto configuration = [NSWorkspaceOpenConfiguration configuration];
        [workspace openURL: url
             configuration: configuration
         completionHandler: ^(NSRunningApplication *app, NSError *error)
        {
           auto json = JSON::Object {};
           if (error) {
             if (error.debugDescription.UTF8String) {
               debug("%s", error.debugDescription.UTF8String);
             }

             json = JSON::Object::Entries {
               {"source", "platform.openExternal"},
               {"err", JSON::Object::Entries {
                 {"message", error.localizedDescription.UTF8String}
               }}
             };
           } else {
            json = JSON::Object::Entries {
              {"source", "platform.openExternal"},
              {"data", JSON::Object::Entries {{ "url", value}}}
            };
           }

          callback(seq, json, Post{});
        }];
      #endif
    #elif SOCKET_RUNTIME_PLATFORM_LINUX
      auto list = gtk_window_list_toplevels();
      auto json = JSON::Object {};

      // initial state is a failure
      json = JSON::Object::Entries {
        {"source", "platform.openExternal"},
        {"err", JSON::Object::Entries {
          {"message", "Failed to open external URL"}
        }}
      };

      if (list != nullptr) {
        for (auto entry = list; entry != nullptr; entry = entry->next) {
          auto window = GTK_WINDOW(entry->data);

          if (window != nullptr && gtk_window_is_active(window)) {
            auto err = (GError*) nullptr;
            auto uri = value.c_str();
            auto ts = GDK_CURRENT_TIME;

            /**
             * GTK may print a error in the terminal that looks like:
             *
             *   libva error: vaGetDriverNameByIndex() failed with unknown libva error, driver_name = (null)
             *
             * It doesn't prevent the URI from being opened.
             * See https://github.com/intel/media-driver/issues/1349 for more info
             */
            auto success = gtk_show_uri_on_window(window, uri, ts, &err);

            if (success) {
              json = JSON::Object::Entries {
                {"source", "platform.openExternal"},
                {"data", JSON::Object::Entries {}}
              };
            } else if (err != nullptr) {
              json = JSON::Object::Entries {
                {"source", "platform.openExternal"},
                {"err", JSON::Object::Entries {
                  {"message", err->message}
                }}
              };
            }

            break;
          }
        }

        g_list_free(list);
      }

      callback(seq, json, Post{});
    #elif SOCKET_RUNTIME_PLATFORM_WINDOWS
      auto uri = value.c_str();
      ShellExecute(nullptr, "Open", uri, nullptr, nullptr, SW_SHOWNORMAL);
      // TODO how to detect success here. do we care?
      callback(seq, JSON::Object{}, Post{});
    #else
      const auto json = JSON::Object::Entries {
        {"source", "platform.openExternal"},
        {"err", JSON::Object::Entries {
          {"type", "NotSupportedError"},
          {"message", "Operation not supported"}
        }}
      };
      callback(seq, json, Post{});
    #endif
  }
}