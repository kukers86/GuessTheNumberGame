//This is the service worker with the Advanced caching

const CACHE = "Guess-The-Number-Game-cache";
const precacheFiles = [
	/* Add an array of files to precache for your app */
	'/GuessTheNumberGame/favicon.ico',
	'/GuessTheNumberGame/index.html',
	'/GuessTheNumberGame/manifest.json',
	'/GuessTheNumberGame/sw.js',
	'/GuessTheNumberGame/css/dark.css',
	'/GuessTheNumberGame/css/light.css',
	'/GuessTheNumberGame/english/game.html',
	'/GuessTheNumberGame/english/index.html',
	'/GuessTheNumberGame/english/js/game.js',
	'/GuessTheNumberGame/images/hello-icon-128.png',
	'/GuessTheNumberGame/images/hello-icon-144.png',
	'/GuessTheNumberGame/images/hello-icon-152.png',
	'/GuessTheNumberGame/images/hello-icon-192.png',
	'/GuessTheNumberGame/images/hello-icon-256.png',
	'/GuessTheNumberGame/images/hello-icon-512.png',
	'/GuessTheNumberGame/images/author.png',
	'/GuessTheNumberGame/js/main.js',
	'/GuessTheNumberGame/js/common.js',
	'/GuessTheNumberGame/polski/game.html',
	'/GuessTheNumberGame/polski/index.html',
	'/GuessTheNumberGame/polski/js/game.js',
	'/GuessTheNumberGame/offline.html',
	'/GuessTheNumberGame/info.html'
];

// TODO: replace the following with the correct offline fallback page i.e.: const offlineFallbackPage = "offline.html";
const offlineFallbackPage = "/GuessTheNumberGame/offline.html";

const networkFirstPaths = [
	/* Add an array of regex of paths that should go network first */
	// Example: /\/api\/.*/
];

const avoidCachingPaths = [
	/* Add an array of regex of paths that shouldn't be cached */
	// Example: /\/api\/.*/
];

function pathComparer(requestUrl, pathRegEx) {
	return requestUrl.match(new RegExp(pathRegEx));
}

function comparePaths(requestUrl, pathsArray) {
	if (requestUrl) {
		for (let index = 0; index < pathsArray.length; index++) {
			const pathRegEx = pathsArray[index];
			if (pathComparer(requestUrl, pathRegEx)) {
				return true;
			}
		}
	}

	return false;
}

self.addEventListener("install", function (event) {
	console.log("[PWA Builder] Install Event processing");

	console.log("[PWA Builder] Skip waiting on install");
	self.skipWaiting();

	event.waitUntil(
		caches.open(CACHE).then(function (cache) {
			console.log("[PWA Builder] Caching pages during install");

			return cache.addAll(precacheFiles).then(function () {
				if (offlineFallbackPage === "ToDo-replace-this-name.html") {
					return cache.add(new Response("TODO: Update the value of the offlineFallbackPage constant in the serviceworker."));
				}

				return cache.add(offlineFallbackPage);
			});
		}));
});

// Allow sw to control of current page
self.addEventListener("activate", function (event) {
	console.log("[PWA Builder] Claiming clients for current page");
	event.waitUntil(self.clients.claim());
});

// If any fetch fails, it will look for the request in the cache and serve it from there first
self.addEventListener("fetch", function (event) {
	if (event.request.method !== "GET")
		return;

	if (comparePaths(event.request.url, networkFirstPaths)) {
		networkFirstFetch(event);
	} else {
		cacheFirstFetch(event);
	}
});

function cacheFirstFetch(event) {
	event.respondWith(
		fromCache(event.request).then(
			function (response) {
			// The response was found in the cache so we responde with it and update the entry

			// This is where we call the server to get the newest version of the
			// file to use the next time we show view
			if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
				return;
			}

			event.waitUntil(
				fetch(event.request).then(function (response) {
					return updateCache(event.request, response);
				}));

			return response;
		},
			function () {
			// The response was not found in the cache so we look for it on the server
			return fetch(event.request)
			.then(function (response) {
				// If request was success, add or update it in the cache
				event.waitUntil(updateCache(event.request, response.clone()));

				return response;
			})
			.catch(function (error) {
				// The following validates that the request was for a navigation to a new document
				if (event.request.destination !== "document" || event.request.mode !== "navigate") {
					return;
				}

				console.log("[PWA Builder] Network request failed and no cache." + error);
				// Use the precached offline page as fallback
				return caches.open(CACHE).then(function (cache) {
					cache.match(offlineFallbackPage);
				});
			});
		}));
}

function networkFirstFetch(event) {
	event.respondWith(
		fetch(event.request)
		.then(function (response) {
			// If request was success, add or update it in the cache
			event.waitUntil(updateCache(event.request, response.clone()));
			return response;
		})
		.catch(function (error) {
			console.log("[PWA Builder] Network request Failed. Serving content from cache: " + error);
			return fromCache(event.request);
		}));
}

function fromCache(request) {
	// Check to see if you have it in the cache
	// Return response
	// If not in the cache, then return error page
	return caches.open(CACHE).then(function (cache) {
		return cache.match(request).then(function (matching) {
			if (!matching || matching.status === 404) {
				return Promise.reject("no-match");
			}

			return matching;
		});
	});
}

function updateCache(request, response) {
	if (!comparePaths(request.url, avoidCachingPaths)) {
		return caches.open(CACHE).then(function (cache) {
			return cache.put(request, response);
		});
	}

	return Promise.resolve();
}
