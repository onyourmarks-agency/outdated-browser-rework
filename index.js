var evaluateBrowser = require("./evaluateBrowser")
var languageMessages = require("./languages.json")
var deepExtend = require("./extend")
var UserAgentParser = require("ua-parser-js")

var COLORS = {
	salmon: "#f25648",
	white: "white"
}

module.exports = function(options) {
	var main = function() {
		// Despite the docs, UA needs to be provided to constructor explicitly:
		// https://github.com/faisalman/ua-parser-js/issues/90
		var parsedUserAgent = new UserAgentParser(navigator.userAgent).getResult()

		// Variable definition (before ajax)
		var outdatedUI = document.getElementById("outdated")

		// Set default options
		options = options || {}

		var browserLocale = window.navigator.language || window.navigator.userLanguage // Everyone else, IE
		// CSS property to check for. You may also like 'borderSpacing', 'boxShadow', 'transform', 'borderImage';
		var backgroundColor = options.backgroundColor || COLORS.salmon
		var textColor = options.textColor || COLORS.white
		var fullscreen = options.fullscreen || false
		var language = options.language || browserLocale.slice(0, 2) // Language code
		var dismissValidSeconds = options.dismissValidSeconds || 604800; // One week
		var dismissLocalStorageKey = options.dismissLocalStorage || 'outdatedBrowserDismiss';

		var updateSource = "web" // Other possible values are 'googlePlay' or 'appStore'. Determines where we tell users to go for upgrades.

		// Chrome mobile is still Chrome (unlike Safari which is 'Mobile Safari')
		var isAndroid = parsedUserAgent.os.name === "Android"
		if (isAndroid) {
			updateSource = "googlePlay"
		} else if  (parsedUserAgent.os.name === "iOS") {
			updateSource = "appStore"
		}

		var isBrowserUnsupported = false // set later after browser evaluation

		var done = true;

		// Has local storage?
		var localStorageIsSupported = function() {
			return Storage !== void(0);
		}

		// Match if message is closed earlier
		var messageIsClosedBefore = function() {
			if (!localStorageIsSupported()) {
				return false
			}

			var closedTimestamp = Math.floor(window.localStorage.getItem(dismissLocalStorageKey));
			var now = new Date().getTime();

			if (!closedTimestamp) {
				return false;
			}

			if (now < closedTimestamp + dismissValidSeconds) {
				return true;
			} else {
				window.localStorage.removeItem(dismissLocalStorageKey);
				return false;
			}
		}

		var parseMinorVersion = function (version) {
			return version.replace(/[^\d.]/g,'').split(".")[1];
		}

		// Style element explicitly - TODO: investigate and delete if not needed
		var startStylesAndEvents = function () {
			var buttonClose = document.getElementById("buttonCloseUpdateBrowser")
			var buttonUpdate = document.getElementById("buttonUpdateBrowser")

			//check settings attributes
			outdatedUI.style.backgroundColor = backgroundColor
			//way too hard to put !important on IE6
			outdatedUI.style.color = textColor
			outdatedUI.children[0].children[0].style.color = textColor
			outdatedUI.children[0].children[1].style.color = textColor

			// Update button is desktop only
			if (buttonUpdate) {
				buttonUpdate.style.color = textColor
				if (buttonUpdate.style.borderColor) {
					buttonUpdate.style.borderColor = textColor
				}

				// Override the update button color to match the background color
				buttonUpdate.onmouseover = function () {
					this.style.color = backgroundColor
					this.style.backgroundColor = textColor
				}

				buttonUpdate.onmouseout = function () {
					this.style.color = textColor
					this.style.backgroundColor = backgroundColor
				}
			}

			buttonClose.style.color = textColor

			buttonClose.onmousedown = function () {
				outdatedUI.style.display = "none"

				if (localStorageIsSupported()) {
					window.localStorage.setItem(dismissLocalStorageKey, new Date().getTime());
				}

				return false
			}
		}

		var getMessage = function (lang) {
			var defaultMessages = languageMessages[lang] || languageMessages.en
			var customMessages = options.messages && options.messages[lang]
			var messages = deepExtend({}, defaultMessages, customMessages)

			var updateMessages = {
				web:
					"<p>" +
					messages.update.web +
					(messages.url ? (
						'<a id="buttonUpdateBrowser" rel="nofollow" href="' +
						messages.url +
						'">' +
						messages.callToAction +
						"</a>"
					) : '') +
					"</p>",
				googlePlay:
					"<p>" +
					messages.update.googlePlay +
					'<a id="buttonUpdateBrowser" rel="nofollow" href="https://play.google.com/store/apps/details?id=com.android.chrome">' +
					messages.callToAction +
					"</a></p>",
				appStore: "<p>" + messages.update[updateSource] + "</p>"
			}

			var globalMessage = "<p>" + messages.update.global + "</p>";
			var updateMessage = updateMessages[updateSource]

			var browserSupportMessage = messages.outOfDate;
			if (isBrowserUnsupported && messages.unsupported) {
				browserSupportMessage = messages.unsupported;
			}

			return (
				'<div class="vertical-center"><h6>' +
				browserSupportMessage +
				"</h6>" +
				globalMessage +
				updateMessage +
				'<p class="last"><a href="#" id="buttonCloseUpdateBrowser" title="' +
				messages.close +
				'">&times;</a></p></div>'
			)
		}

		var result = evaluateBrowser(parsedUserAgent, options);

		if (!messageIsClosedBefore() && (result.isAndroidButNotChrome || result.isBrowserOutOfDate || !result.isPropertySupported)) {
			// This is an outdated browser and the banner needs to show
			// Set this flag with the result for `getMessage`
			isBrowserUnsupported = result.isBrowserUnsupported

			done = false
			outdatedUI.style.display = "table";

			var insertContentHere = document.getElementById("outdated")
			if (fullscreen) {
				insertContentHere.classList.add("fullscreen")
			}
			insertContentHere.innerHTML = getMessage(language)
			startStylesAndEvents()
		}
	}

	// Load main when DOM ready.
	var oldOnload = window.onload
	if (typeof window.onload !== "function") {
		window.onload = main
	} else {
		window.onload = function() {
			if (oldOnload) {
				oldOnload()
			}
			main()
		}
	}
}
