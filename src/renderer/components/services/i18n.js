import webModule from '@/app-module/web'

const I18N_FACTORY_NAME = 'I18n'

webModule
  .factory(I18N_FACTORY_NAME, [
    function() {
      var defaultLocale = navigator.language;
      console.log("Default Locale:", defaultLocale);

      var _transMap = {}; // locale: kvPairs
      return {
        init: function(locale, kvPairs) {
          _transMap[locale] = kvPairs;
        },
        use: function(locale) {
          defaultLocale = locale;
        },
        getLocale: function() {
          return defaultLocale;
        },
        translate: function(key, options, locale) {
          try {
            if (options) {
              console.log(key, options, locale, defaultLocale, _transMap);
              var msg = _transMap[locale || defaultLocale][key];
              for (var k in options) {
                msg.replace(
                  new Regex("\\{\\{" + k + "\\}\\}", "g"),
                  options[k]
                );
              }
              return msg;
            } else {
              return _transMap[locale || defaultLocale][key];
            }
          } catch (e) {
            console.log("---", e);
            return key;
          }
        }
      };
    }
  ])
  .filter("translate2", [
    "I18n",
    function(I18n) {
      return function(key, options) {
        return I18n.translate(key, options);
      };
    }
  ]);

export default I18N_FACTORY_NAME
