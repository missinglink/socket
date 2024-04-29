#ifndef SSC_CORE_URL_H
#define SSC_CORE_URL_H

#include "types.hh"
#include "json.hh"

namespace SSC {
  struct URL {
    struct Components {
      String originalURL = "";
      String scheme = "";
      String authority = "";
      String pathname = "";
      String query = "";
      String fragment = "";

      static const Components parse (const String& url);
    };

    // core properties
    String href = "";
    String origin = "";
    String protocol = "";
    String username = "";
    String password = "";
    String hostname = "";
    String port = "";
    String pathname = "";
    String search = ""; // includes '?' and 'query' if 'query' is not empty
    String hash = ""; // include '#' and 'fragment' if 'fragment' is not empty

    // extra properties
    String scheme;
    String fragment;
    String query;
    Map searchParams;

    URL (const String& href);
    URL (const JSON::Object& json);
    const String str () const;
    const JSON::Object json () const;
  };
}
#endif