'use strict';

var { retryPromiseOperation } = require('../retry-util');

/**
 * A service which fetches and caches API route metadata.
 */
// @ngInject
function apiRoutes($http, settings) {
  // Cache of route name => route metadata from API root.
  var routeCache;
  // Cache of links to pages on the service fetched from the API's "links"
  // endpoint.
  var linkCache;

  function getJSON(url) {
    return $http.get(url).then(({ status, data }) => {
      if (status !== 200) {
        throw new Error(`Fetching ${url} failed`);
      }
      return data;
    });
  }

  /**
   * Fetch and cache API route metadata.
   *
   * Routes are fetched without any authentication and therefore assumed to be
   * the same regardless of whether the user is authenticated or not.
   *
   * @return {Promise<Object>} - Map of routes to route metadata.
   */
  function routes() {
    if (!routeCache) {
      routeCache = retryPromiseOperation(() => getJSON(settings.apiUrl))
        .then((index) => index.links);
    }
    return routeCache;
  }

  /**
   * Fetch and cache service page links from the API.
   *
   * @return {Promise<Object>} - Map of link name to URL
   */
  function links() {
    if (!linkCache) {
      linkCache = routes().then(routes => {
        return getJSON(routes.links.url);
      });
    }
    return linkCache;
  }

  return { routes, links };
}

module.exports = apiRoutes;
