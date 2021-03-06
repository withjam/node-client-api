/*
 * Copyright 2014 MarkLogic Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var deepcopy = require('deepcopy');
var valcheck = require('core-util-is');
var mlutil = require('./mlutil.js');

var comparisons = {
    '<'  : 'LT',
    '<=' : 'LE',
    '>'  : 'GT',
    '>=' : 'GE',
    '='  : 'EQ',
    '!=' : 'NE'
};
var datatypes = {
    'xs:anyURI':            'xs:anyURI',
    'xs:date':              'xs:date',
    'xs:dateTime':          'xs:dateTime',
    'xs:dayTimeDuration':   'xs:dayTimeDuration',
    'xs:decimal':           'xs:decimal',
    'xs:double':            'xs:double',
    'xs:float':             'xs:float',
    'xs:gDay':              'xs:gDay',
    'xs:gMonth':            'xs:gMonth',
    'xs:gMonthDay':         'xs:gMonthDay',
    'xs:gYear':             'xs:gYear',
    'xs:gYearMonth':        'xs:gYearMonth',
    'xs:int':               'xs:int',
    'xs:long':              'xs:long',
    'xs:string':            'xs:string',
    'xs:time':              'xs:time',
    'xs:unsignedInt':       'xs:unsignedInt',
    'xs:unsignedLong':      'xs:unsignedLong',
    'xs:yearMonthDuration': 'xs:yearMonthDuration'
};
/** @ignore */
function asIndex(index) {
  return valcheck.isString(index) ? property(index) : index;
}
/** @ignore */
function addIndex(query, index, isContainer) {
  var containerOnly = (isContainer || false);
  if (index['json-property'] !== undefined) {
    query['json-property'] = index['json-property'];
  } else if (index.element !== undefined) {
    query.element = index.element;
    if (index.attribute !== undefined) {
      query.attribute = attribute;
    }
  } else if (containerOnly) {
  } else if (index.field !== undefined) {
    query.field = index.field;
  } else if (index['path-index'] !== undefined) {
    query['path-index'] = index['path-index'];
  }
}

/**
 * A helper for building the definition of a document query. The helper is
 * created by the {@link module:marklogic.queryBuilder} function. 
 * @namespace queryBuilder
 */

/**
 * A composable query.
 * @typedef {object} queryBuilder.Query
 */
/**
 * An indexed name such as a JSON property, XML element or attribute, field,
 * or path index.
 * @typedef {object} queryBuilder.IndexedName
 */
/**
 * The specification of a point or an area (such as a box, circle, or polygon)
 * for use as criteria in a geospatial query.
 * @typedef {object} queryBuilder.Region
 */
/**
 * The specification of the latitude and longitude 
 * returned by the {@link queryBuilder#latlon} function
 * for a coordinate of a {@link queryBuilder.Region}.
 * @typedef {object} queryBuilder.LatLon
 */


/**
 * Builds a query for the intersection of the subqueries.
 * @method
 * @memberof queryBuilder#
 * @param {...queryBuilder.Query} subquery - a word, value, range, geospatial,
 * or other query or a composer such as an or query.
 * @param {queryBuilder.OrderParam} [ordering] - the ordering on the subqueries
 * returned from {@link queryBuilder#ordered}
 * @returns {queryBuilder.Query} a composable query
 */
function and() {
  var args = mlutil.asArray.apply(null, arguments);
  var query = {
    queries: []
  };
  var seekingOrdered = true;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (seekingOrdered && arg.ordered !== null && arg.ordered !== undefined) {
      query.ordered = arg.ordered;
      seekingOrdered = false;
    } else if (arg instanceof Array){
      Array.prototype.push.apply(query.queries, arg);
    } else if (seekingOrdered && valcheck.isBoolean(arg)) {
      query.ordered = arg;
      seekingOrdered = false;
    } else {
      query.queries.push(arg);
    }
  }
  return {'and-query': query};
}
/**
 * Builds a query with positive and negative subqueries.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query} positiveQuery - a query that must match
 * the result documents
 * @param {queryBuilder.Query} negativeQuery - a query that must not match
 * the result documents
 * @returns {queryBuilder.Query} a composable query
 */
function andNot() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    throw new Error('missing positive and negative queries: '+args);
  case 1:
    throw new Error('missing negative query: '+args);
  default:
    return {'and-not-query':{
      'positive-query': args[0],
      'negative-query': args[1]
    }};
  }
}
/**
 * Specifies an XML attribute for a query.  A name without a namespace can be
 * expressed as a string.  A namespaced name can be expressed as a two-item
 * array with uri and name strings or as an object returned by the 
 * {@link queryBuilder#qname} function.
 * @method
 * @memberof queryBuilder#
 * @param {string|string[]|queryBuilder.QName} element - the name of the element
 * @param {string|string[]|queryBuilder.QName} attribute - the name of the attribute
 * @returns {queryBuilder.IndexedName} an indexed name for specifying a query
 */
function attribute() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    throw new Error('missing element and attribute: '+args);
  case 1:
    throw new Error('missing attribute: '+args);
  case 2:
    return {
      element:   (!valcheck.isUndefined(args[0].qname)) ?
          args[0].qname : nsName.call(null, args[0]),
      attribute: (!valcheck.isUndefined(args[1].qname)) ?
          args[1].qname : nsName.call(null, args[1])
      };
  case 3:
    if (!valcheck.isUndefined(args[0].qname)) {
      return {
        element: args[0].qname,
        attribute:{ns: args[1], name: args[2]}
      };      
    } else if (!valcheck.isUndefined(args[2].qname)) {
      return {
        element:{ns: args[0], name: args[1]},
        attribute: args[2].qname
      };
    } else if (valcheck.isArray(args[0])) {
      return {
        element: nsName.call(null, args[0]),
        attribute:{ns: args[1], name: args[2]}
      };
    }
    return {
      element:{ns: args[0], name: args[1]},
      attribute: nsName.call(null, args[2])
      };
  default:
    return {
      element:{ns: args[0], name: args[1]},
      attribute:{ns: args[2], name: args[3]}
      };
 }
}
/**
 * Builds a query with matching and boosting subqueries.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query} matchingQuery - a query that must match
 * the result documents
 * @param {queryBuilder.Query} boostingQuery - a query that increases
 * the ranking when qualifying result documents
 * @returns {queryBuilder.Query} a composable query
 */
function boost() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    throw new Error('missing matching and boosting queries: '+args);
  case 1:
    throw new Error('missing boosting query: '+args);
  default:
    return {'boost-query':{
      'matching-query': args[0],
      'boosting-query': args[1]
    }};
  }
}
/**
 * Specifies a rectangular region with the coordinates of the corners.
 * The coordinates can be specified either by passing the return value
 * from the {@link queryBuilder#southWestNorthEast} function or as a list
 * of {queryBuilder.LatLon} coordinates in South, West, North, and East order.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.LatLon} south - the south coordinate of the box
 * @param {queryBuilder.LatLon} west - the west coordinate for the box
 * @param {queryBuilder.LatLon} north - the north coordinate for the box
 * @param {queryBuilder.LatLon} east - the east coordinate for the box
 * @returns {queryBuilder.Region} the region criteria for a geospatial query
 */
function box() {
  var args = mlutil.asArray.apply(null, arguments);
  var region = null;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    switch(i) {
    case 0:
      if (arg.south && arg.west && arg.north && arg.east) {
        region = arg;
      } else {
        region = {south: arg};
      }
      break;
    case 1:
      region.west = arg;
      break;
    case 2:
      region.north = arg;
      break;
    case 3:
      region.east = arg;
      break;
    default:
      throw new Error('unsupported parameter: '+arg);
    }
  }
  return {box: region};
}
/**
 * Specifies a circular region based on a radius and the coordinate of the center.
 * The coordinate can either be specified by passing the return value from
 * the {@link queryBuilder#latlon} function or by passing the latitude and longitude
 * numbers in that order (possibly wrapped in an array).
 * @method
 * @memberof queryBuilder#
 * @param {number} radius - the radius for the circle
 * @param {queryBuilder.LatLon} center - the center for the circle
 * @returns {queryBuilder.Region} the region criteria for a geospatial query
 */
function circle() {
  var args = mlutil.asArray.apply(null, arguments);
  var query = {};
  var seekingRadius    = true;
  var seekingLatitude  = true;
  var seekingLongitude = true;
  var point = null;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (seekingRadius && valcheck.isNumber(arg)) {
      query.radius = arg;
      seekingRadius = false;
    } else if (seekingLatitude && arg.point) {
      query.point = arg.point;
      seekingLatitude  = false;
      seekingLongitude = false;
    } else if (seekingLatitude && arg.latitude && arg.longitude) {
      query.point = [arg];
      seekingLatitude  = false;
      seekingLongitude = false;
    } else if (seekingLatitude && arg instanceof Array && arg.length === 2) {
      query.point = [{latitude: arg[0], longitude: arg[1]}];
      seekingLatitude  = false;
      seekingLongitude = false;
    } else if (seekingLatitude && valcheck.isNumber(arg)) {
      point = {latitude: arg};
      seekingLatitude = false;
    } else if (seekingLongitude && valcheck.isNumber(arg)) {
      point.longitude = arg;
      seekingLongitude = false;
    } else {
      throw new Error('unsupported parameter: '+arg);
    }
  }
  if (point !== null && point.latitude && point.longitude) {
    query.point = [point];
  } else if (seekingLatitude || seekingLongitude) {
    throw new Error('failed to discover latitude and longitude: '+args);
  }
  return {circle: query};
}
/**
 * Builds a query matching documents in one or more collections as part
 * of a document query.  The collections can be specified as arguments or
 * parsed from a query string based on a binding. Also, as part of a values
 * query, the collection() function identifies the collection index
 * without supplying criteria. In a values query, the tuples (aka rows)
 * projected from each document have a column whose values are the
 * collections to which the document belongs.
 * @method
 * @memberof queryBuilder#
 * @param {string|string[]|queryBuilder.BindingParam} collections - either
 * one or more collection uris to match or exactly one binding (returned
 * by the {@link queryBuilder#bind} function) for parsing the collection
 * uris from a query string; required except for values queries
 * @param {string} [prefix] - a prefix to prepend to each value provided by
 * the parsed query string; can be provided only when providing a binding
 * @returns {queryBuilder.Query} a composable query
 */
function collection() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (argLen === 0) {
    return {collection: null};
  }
  if (argLen <= 2) {
    for (var i=0; i < argLen; i++) {
      var arg = args[i];
      var constraintName = arg.constraintName;
      if (!valcheck.isUndefined(constraintName)) {
        var qualifier = {};
        if (argLen === 2) {
          var prefix = args[(i + 1) % 2];
          if (!valcheck.isUndefined(prefix)) {
            qualifier.prefix = prefix;
          }
        }
        return {
          name: constraintName,
          collection: qualifier
        };
      }
    }
  }
  return {'collection-query': {
    uri: args
  }};
}
/**
 * Builds a query matching temporal documents with a system start time
 * prior to the LSQT (Latest System Query Time). Advancing the LSQT can be 
 * done manually or on an automated basis to include more recent
 * temporal documents in the result set.
 * @method
 * @memberof queryBuilder#
 * @param {string} temporalCollection - the name of the temporal collection
 * that retains the temporal documents
 * @param {queryBuilder.WeightParam} [weight] - a weight returned
 * by {@link queryBuilder#weight} to increase or decrease the score
 * of subqueries relative to other queries in the complete search
 * @param {string|Date} [timestamp] - a datetime older than the LSQT
 * to use as the upper boundary for an older view of the database  
 * @param {queryBuilder.TemporalOptionsParam} [temporalOptions] - a list
 * of options returned by {@link queryBuilder#temporalOptions} to modify
 * the temporal query
 * @returns {queryBuilder.Query} a composable query
 */
function lsqtQuery() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (argLen < 1) {
    throw new Error('no temporal collection for lsqt query');
  }

  var query = {};
  var seekingWeight = true;
  var seekingTimestamp = true;
  var seekingTemporalOption = true;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (i === 0) {
      if (!valcheck.isString(arg)) {
        throw new Error('first argument for current time query must be temporal collection');
      }
      query['temporal-collection'] = arg;
    } else if (seekingWeight && arg.weight) {
      query.weight = arg.weight;
      seekingWeight = false;
    } else if (seekingWeight && valcheck.isNumber(arg)) {
      query.weight = arg;
      seekingWeight = false;
    } else if (seekingTimestamp && valcheck.isString(arg)){
      query.timestamp = arg;
      seekingTimestamp = false;
    } else if (seekingTimestamp && valcheck.isDate(arg)){
      query.timestamp = arg.toISOString();
      seekingTimestamp = false;
    } else if (seekingTemporalOption && arg['temporal-option'] !== undefined) {
      query['temporal-option'] = arg['temporal-option'];
      seekingTemporalOption = false;
    }
  }
  return {'lsqt-query': query};
}
/**
 * Builds a query naming a JSON property or XML element that must contain
 * the matches for a subquery (which may be a composer query such as those
 * returned by the {@link queryBuilder#and} and {@link queryBuilder#or}).
 * @method
 * @memberof queryBuilder#
 * @param {string|queryBuilder.IndexedName} propertyOrElement - the JSON 
 * property or XML element that contains the query matches; a string is
 * treated as a JSON property
 * @param {queryBuilder.Query|queryBuilder.BindingParam} query - either the
 * query that must match within the scope of the JSON property or XML element
 * or a binding (returned by the {@link queryBuilder#bind} function) for
 * parsing the subquery from a query string
 * @param {queryBuilder.Query} matchingQuery - a query that must match
 * the result documents
 * @param {queryBuilder.FragmentScopeParam} [fragmentScope] - whether the query
 * applies to document content (the default) or document metadata properties
 * as returned by the {@link queryBuilder#fragmentScope} function
 * @returns {queryBuilder.Query} a composable query
 */
function scope() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length < 1) {
    throw new Error('element or property scope not specified: '+args);
  }
  var constraintIndex = null;
  var constraint = {};
  var constraintName;
  var fragmentScope;
  var hasQuery = false;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (i === 0) {
      constraintIndex = asIndex(arg);
      addIndex(constraint, constraintIndex, true);
      continue;
    }
    if (fragmentScope === undefined) {
      fragmentScope = arg['fragment-scope'];
      if (fragmentScope !== undefined) {
        constraint['fragment-scope'] = fragmentScope;
        continue;
      }
    }
    if (constraintName === undefined) {
      constraintName = arg.constraintName;
      if (constraintName !== undefined) {
        continue;
      }
    }
    if (hasQuery) {
      continue;
    }
    hasQuery = true;
    var queryKeys = Object.keys(arg);
    for (var j=0; j < queryKeys.length; j++) {
      var queryKey = queryKeys[j];
      constraint[queryKey] = arg[queryKey];
    }
  }

  var wrapper = {};
  if (hasQuery) {
    if (constraintName === undefined) {
      wrapper['container-query'] = constraint;
    } else {
      throw new Error('scope has both binding and query: '+args);
    }
  } else {
    if (constraintName === undefined) {
      constraintName = defaultConstraintName(constraintIndex);
      if (constraintName === null) {
        throw new Error('could not default constraint name from '+
            Object.keys(constraintIndex).join(', ') + ' index'
            );
      }
    }
    wrapper.name = constraintName;
    wrapper.container = constraint;
  }

  return wrapper;
}
/**
 * The datatype specification returned by the {@link queryBuilder#datatype}
 * function.
 * @typedef {object} queryBuilder.DatatypeParam
 */
/**
 * Identifies the datatype of an index.
 * @method
 * @memberof queryBuilder#
 * @param {string} datatype - a value from the enumeration
 * int|unsignedInt|long|unsignedLong|float|double|decimal|dateTime|time|date|gYearMonth|gYear|gMonth|gDay|yearMonthDuration|dayTimeDuration|string|anyURI|point
 * @param {string} [collation] - a URI identifying the comparison method for a string or anyURI datatype
 * @returns {queryBuilder.DatatypeParam} a datatype specification
 */
function datatype() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    throw new Error('missing datatype: '+args);
  case 1:
    return {datatype: /^xs:/.test(args[0]) ? args[0] : 'xs:'+args[0]};
  default:
    return {datatype: /^xs:/.test(args[0]) ? args[0] : 'xs:'+args[0],
        'collation': args[1]};
  }
}
/**
 * Builds a query matching documents in one or more database directories.
 * @method
 * @memberof queryBuilder#
 * @param {string|string[]} uris - one or more directory uris
 * to match 
 * @param {boolean} [infinite] - whether to match documents at the top level or
 * at any level of depth within the specified directories
 * @returns {queryBuilder.Query} a composable query
 */
function directory() {
  var args = mlutil.asArray.apply(null, arguments);
  var query = {
      uri: []
  };
  var seekingInfinite = true;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (seekingInfinite && valcheck.isBoolean(arg)) {
      query.infinite = arg;
      seekingInfinite = false;
    } else if (arg instanceof Array){
      Array.prototype.push.apply(query.uri, arg);
    } else {
      query.uri.push(arg);
    }
  }
  return {'directory-query': query};
}
/**
 * Builds a query matching documents.
 * @method
 * @memberof queryBuilder#
 * @param {string|string[]} uris - one or more document uris
 * to match 
 * @returns {queryBuilder.Query} a composable query
 */
function document() {
  return {'document-query':{
    uri: mlutil.asArray.apply(null, arguments)
  }};
}
/**
 * Builds a query that applies the subquery to document content by contrast
 * with the {@link queryBuilder#properties} function.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query} query - the query that must match document content
 * @returns {queryBuilder.Query} a composable query
 */
function documentFragment() {  
  return {'document-fragment-query': mlutil.first.apply(null, arguments)};
}
/**
 * Specifies an XML element for a query.  A name without a namespace can be
 * expressed as a string.  A namespaced name can be expressed as a two-item
 * array with uri and name strings or as an object returned by the 
 * {@link queryBuilder#qname} function.
 * @method
 * @memberof queryBuilder#
 * @param {string|string[]|queryBuilder.QName} name - the name of the element
 * @returns {queryBuilder.IndexedName} an indexed name for specifying a query
 */
function element() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    throw new Error('missing element: '+args);
  case 1:
    return {
      element: (!valcheck.isUndefined(args[0].qname)) ?
          args[0].qname : nsName.call(null, args[0])
    };
  default:
    return {element:{ns: args[0], name: args[1]}};
 }
}
/**
 * Specifies a field for a query.
 * @method
 * @memberof queryBuilder#
 * @param {string} name - the name of the field
 * @returns {queryBuilder.IndexedName} an indexed name for specifying a query
 */
function field() {
  return {field: mlutil.first.apply(null, arguments)};
}
/**
 * A query argument specifying whether queries match documents based on
 * document content or document metadata properties; returned
 * by the {@link queryBuilder#fragmentScope} function.
 * @typedef {object} queryBuilder.FragmentScopeParam
 */
/**
 * Configures a query to match documents based on document content or
 * document metadata properties.
 * @method
 * @memberof queryBuilder#
 * @param {string} scopeType - a value from the documents|properties
 * enumeration where 'documents' queries document content and
 * 'properties' queries document metadata properties
 * @returns {queryBuilder.FragmentScopeParam} a fragment scope specification 
 */
function fragmentScope() {
  var scope = mlutil.first.apply(null, arguments);
  if (scope === 'documents' || scope === 'properties') {
    return {'fragment-scope': scope};
  }
  throw new Error('unknown argument: '+scope);
}
/* TODO: all geospatial
 or facet 
 To specify a query,
 To specify a facet, you must supply a heatmap instead.
 for a where clause, you must supply the criteria and not the heatmap
 * @param {queryBuilder.HeatMapParam} [heatmap] - a heatmap (returned by
 * the {@link queryBuilder#heatmap} function) for specifying the grid
 * for a geospatial facet; for a calculate clause, you must supply
 * the heatmap and not the criteria
 */
/**
 * Builds a query over a geospatial location represented
 * by an XML attribute pair. You must supply either
 * the {queryBuilder.Region} criteria or a binding to parse the
 * region criteria from a query string but not both.
 * @method
 * @memberof queryBuilder#
 * @param {string|queryBuilder.QName} parent - the name of the element 
 * containing the attributes as returned by the {@link queryBuilder#qname} function
 * @param {string|queryBuilder.QName} latitude - the name of the latitude
 * attribute as returned by the {@link queryBuilder#qname} function
 * @param {string|queryBuilder.QName} longitude -  the name of the longitude
 * attribute as returned by the {@link queryBuilder#qname} function
 * @param {queryBuilder.FragmentScopeParam} [fragmentScope] - whether the query
 * applies to document content (the default) or document metadata properties
 * as returned by the {@link queryBuilder#fragmentScope} function
 * @param {queryBuilder.GeoOptionsParam} [geoOptions] - a list
 * of options returned by {@link queryBuilder#geoOptions} to modify
 * the geospatial query
 * @param {queryBuilder.Region|queryBuilder.BindingParam} [criteria] - either
 * a point matching or region containing geospatial locations in the documents
 * or a binding (returned by the {@link queryBuilder#bind} function) for parsing
 * the point or region from a query string
 * @returns {queryBuilder.Query} a composable query
 */
function geoAttributePair() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length < 3) {
    throw new Error('not enough parameters for geospatial element query: '+args);
  }
  var query = {};
  var keys = ['parent', 'lat', 'lon'];
  var iArg=0;
  for (var i=0; i < keys.length; i++) {
    var key = keys[i];
    var arg = args[iArg++];
    if (arg.qname) {
      query[key] = arg.qname;
    } else if (valcheck.isString(arg)) {
      query[key] = nsName.call(null, arg);
    } else if (arg.element) {
      if (key === 'parent' || !query.parent) {
        query.parent = arg.element;
      }
      if (arg.attribute) {
        if (key === 'parent') {
          i++;
        }
        query[keys[i]] = arg.attribute;
      }
    } else {
      throw new Error('no parameter for '+key+': '+JSON.stringify(arg));
    }
  }
  return geoQuery('geo-attr-pair', args, query, iArg);
}
/**
 * Builds a query over a geospatial location represented by
 * an element containing a comma-separated pair of latitude-longitude values.
 * You must supply either {queryBuilder.Region}
 * criteria or a binding to parse the region criteria from a query string
 * but not both.
 * @method
 * @memberof queryBuilder#
 * @param {string|queryBuilder.QName} [parent] - the optional name of the parent
 * of the geospatial element as returned by the {@link queryBuilder#qname} function
 * @param {string|queryBuilder.QName} element - the name of the element
 * as returned by the {@link queryBuilder#qname} function
 * @param {queryBuilder.FragmentScopeParam} [fragmentScope] - whether the query
 * applies to document content (the default) or document metadata properties
 * as returned by the {@link queryBuilder#fragmentScope} function
 * @param {queryBuilder.GeoOptionsParam} [geoOptions] - a list
 * of options returned by {@link queryBuilder#geoOptions} to modify
 * the geospatial query
 * @param {queryBuilder.Region|queryBuilder.BindingParam} [criteria] - either
 * a point matching or region containing geospatial locations in the documents
 * or a binding (returned by the {@link queryBuilder#bind} function) for parsing
 * the point or region from a query string
 * @returns {queryBuilder.Query} a composable query
 */
function geoElement() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (argLen < 1) {
    throw new Error('not enough parameters: '+args);
  }
  var maxIndex = Math.min(argLen, 2);
  var query    = {};
  var elemName = null;
  var i=0;
  while (i < maxIndex) {
    var arg = args[i];
    if (arg.qname) {
      arg = arg.qname;
    } else if (valcheck.isString(arg)) {
      arg = nsName.call(null, arg);
    } else if (arg.element) {
      arg = arg.element;
    } else {
      break;
    }
    if (elemName !== null) {
      query.parent = elemName;
    }
    elemName = arg;
    i++;
  }
  if (elemName === null) {
    throw new Error('element name required for geospatial query: '+args);
  }
  query.element = elemName;
  elemName = null;
  return geoQuery('geo-elem', args, query, i);
}
/**
 * Builds a query over a geospatial location represented
 * by an XML element pair. You must supply either
 * the {queryBuilder.Region} criteria or a binding to parse the
 * region criteria from a query string but not both.
 * @method
 * @memberof queryBuilder#
 * @param {string|queryBuilder.QName} parent - the name of the containing
 * parent element as returned by the {@link queryBuilder#qname} function
 * @param {string|queryBuilder.QName} latitude - the name of the latitude
 * element as returned by the {@link queryBuilder#qname} function
 * @param {string|queryBuilder.QName} longitude -  the name of the longitude
 * element as returned by the {@link queryBuilder#qname} function
 * @param {queryBuilder.FragmentScopeParam} [fragmentScope] - whether the query
 * applies to document content (the default) or document metadata properties
 * as returned by the {@link queryBuilder#fragmentScope} function
 * @param {queryBuilder.GeoOptionsParam} [geoOptions] - a list
 * of options returned by {@link queryBuilder#geoOptions} to modify
 * the geospatial query
 * @param {queryBuilder.Region|queryBuilder.BindingParam} [criteria] - either
 * a point matching or region containing geospatial locations in the documents
 * or a binding (returned by the {@link queryBuilder#bind} function) for parsing
 * the point or region from a query string
 * @returns {queryBuilder.Query} a composable query
 */
function geoElementPair() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length < 3) {
    throw new Error('not enough parameters: '+args);
  }
  var query = {};
  var keys = ['parent', 'lat', 'lon'];
  for (var i=0; i < keys.length; i++) {
    var key = keys[i];
    var arg = args[i];
    if (arg.qname) {
      query[key] = arg.qname;
    } else if (valcheck.isString(arg)) {
      query[key] = nsName.call(null, arg);
    } else if (arg.element) {
      query[key] = arg.element;
    } else {
      throw new Error('no parameter for '+key+': '+JSON.stringify(arg));
    }
  }
  return geoQuery('geo-elem-pair', args, query, 3);
}
/**
 * Builds a query over a geospatial location represented by
 * a JSON property containing a pair of latitude-longitude values.
 * You must supply either {queryBuilder.Region}
 * criteria or a binding to parse the region criteria from a query string
 * but not both.
 * @method
 * @memberof queryBuilder#
 * @param {string} [parent] - the optional name of the parent
 * of the geospatial property
 * @param {string} element - the name of the geospatial property
 * @param {queryBuilder.FragmentScopeParam} [fragmentScope] - whether the query
 * applies to document content (the default) or document metadata properties
 * as returned by the {@link queryBuilder#fragmentScope} function
 * @param {queryBuilder.GeoOptionsParam} [geoOptions] - a list
 * of options returned by {@link queryBuilder#geoOptions} to modify
 * the geospatial query
 * @param {queryBuilder.Region|queryBuilder.BindingParam} [criteria] - either
 * a point matching or region containing geospatial locations in the documents
 * or a binding (returned by the {@link queryBuilder#bind} function) for parsing
 * the point or region from a query string
 * @returns {queryBuilder.Query} a composable query
 */
function geoProperty() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (argLen < 1) {
    throw new Error('not enough parameters for geospatial property query: '+args);
  }
  var maxIndex = Math.min(argLen, 2);
  var query    = {};
  var propName = null;
  var i=0;
  while (i < maxIndex) {
    var arg = args[i];
    if (arg['json-property']) {
      arg = arg['json-property'];
    } else if (!valcheck.isString(arg)) {
      break;
    }
    if (propName !== null) {
      query['parent-property'] = propName;
    }
    propName = arg;
    i++;
  }
  if (propName === null) {
    throw new Error('property name required for geospatial query: '+args);
  }
  query['json-property'] = propName;
  propName = null;
  return geoQuery('geo-json-property', args, query, i);
}
/**
 * Builds a query over a geospatial location represented
 * by a JSON property pair. You must supply either
 * the {queryBuilder.Region} criteria or a binding to parse the
 * region criteria from a query string but not both.
 * @method
 * @memberof queryBuilder#
 * @param {string} parent - the name of the containing parent property
 * @param {string} latitude - the name of the latitude property
 * @param {string} longitude -  the name of the longitude property
 * @param {queryBuilder.FragmentScopeParam} [fragmentScope] - whether the query
 * applies to document content (the default) or document metadata properties
 * as returned by the {@link queryBuilder#fragmentScope} function
 * @param {queryBuilder.GeoOptionsParam} [geoOptions] - a list
 * of options returned by {@link queryBuilder#geoOptions} to modify
 * the geospatial query
 * @param {queryBuilder.Region|queryBuilder.BindingParam} [criteria] - either
 * a point matching or region containing geospatial locations in the documents
 * or a binding (returned by the {@link queryBuilder#bind} function) for parsing
 * the point or region from a query string
 * @returns {queryBuilder.Query} a composable query
 */
function geoPropertyPair() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length < 3) {
    throw new Error('not enough parameters: '+args);
  }
  var query = {};
  var keys = ['parent-property', 'lat-property', 'lon-property'];
  for (var i=0; i < keys.length; i++) {
    var key = keys[i];
    var arg = args[i];
    if (valcheck.isString(arg)) {
      query[key] = arg;
    } else if (arg['json-property']) {
      query[key] = arg['json-property'];
    } else {
      throw new Error('no parameter for '+key+': '+JSON.stringify(arg));
    }
  }
  return geoQuery('geo-json-property-pair', args, query, 3);
}
/**
 * Builds a query over a geospatial location represented by
 * a path index on JSON properties or XML elements containing a pair
 * of latitude-longitude values.
 * You must supply either {queryBuilder.Region}
 * criteria or a binding to parse the region criteria from a query string
 * but not both.
 * @method
 * @memberof queryBuilder#
 * @param {string|object} path - the XPath for the path index as a string or
 * as the return value of the {@link queryBuilder#pathIndex} function
 * @param {queryBuilder.FragmentScopeParam} [fragmentScope] - whether the query
 * applies to document content (the default) or document metadata properties
 * as returned by the {@link queryBuilder#fragmentScope} function
 * @param {queryBuilder.GeoOptionsParam} [geoOptions] - a list
 * of options returned by {@link queryBuilder#geoOptions} to modify
 * the geospatial query
 * @param {queryBuilder.Region|queryBuilder.BindingParam} [criteria] - either
 * a point matching or region containing geospatial locations in the documents
 * or a binding (returned by the {@link queryBuilder#bind} function) for parsing
 * the point or region from a query string
 * @returns {queryBuilder.Query} a composable query
 */
function geoPath() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length < 1) {
    throw new Error('not enough parameters: '+args);
  }
  var query = {};
  var arg = args[0];
  if (arg['path-index']) {
    query['path-index'] = arg['path-index'];
  } else if (arg instanceof Array && arg.length === 2 && valcheck.isString(arg[0])) {
    query['path-index'] = {text: arg[0], namespaces: arg[1]};
  } else if (valcheck.isString(arg)) {
    query['path-index'] = {text: arg, namespaces: ''};
  }
  return geoQuery('geo-path', args, query, 1);
}
/** @ignore */
function geoQuery(variant, args, query, next) {
  var seekingFragmentScope = true;
  var seekingGeoOption = true;
  var seekingRegion = true;
  var seekingHeatmap = true;
  var constraintName;
  for (var i=next; i < args.length; i++) {
    var arg = args[i];
    if (seekingGeoOption && arg['geo-option']) {
      query['geo-option'] = arg['geo-option'];
      seekingGeoOption = false;
    } else if (seekingFragmentScope && arg['fragment-scope']) {
      query['fragment-scope'] = arg['fragment-scope'];
      seekingFragmentScope = false;
    } else if (seekingHeatmap && arg.heatmap) {
      query.heatmap = arg.heatmap;
      seekingHeatmap = false;
    } else if (constraintName !== undefined) {
      continue;
    } else if (seekingRegion && arg.box) {
      query.box = arg.box;
      seekingRegion = false;
    } else if (seekingRegion && arg.circle) {
      query.circle = arg.circle;
      seekingRegion = false;
    } else if (seekingRegion && arg.point) {
      query.point = arg.point;
      seekingRegion = false;
    } else if (seekingRegion && arg.latitude && arg.longitude) {
      query.point = [arg];
      seekingRegion = false;
    } else if (seekingRegion && arg.polygon) {
      query.polygon = arg.polygon;
      seekingRegion = false;
    } else if (seekingRegion && arg instanceof Array && arg.length === 2) {
      query.point = [latlon.call(null, arg)];
      seekingRegion = false;
    } else {
      if (constraintName === undefined) {
        constraintName = arg.constraintName;
        if (constraintName !== undefined) {
          continue;
        }
      }
      throw new Error('unknown parameter: '+arg);
    }
  }

  var wrapper = {};
  if (!valcheck.isUndefined(constraintName)) {
    wrapper.name = constraintName;
    wrapper[variant] = query;
  } else if (seekingRegion) {
    wrapper[variant] = query;
  } else {
    wrapper[variant+'-query'] = query;
  }
  return wrapper;
}
/**
 * Specifies the buckets for a geospatial facet.
 * @typedef {object} queryBuilder.HeatMapParam
 */
/**
 * Divides a geospatial box into a two-dimensional grid for calculating facets
 * based on document counts for each cell within the grid.
 * The coordinates of the box can be specified either by passing the return value
 * from the {@link queryBuilder#southWestNorthEast} function or as a list
 * of {queryBuilder.LatLon} coordinates in South, West, North, and East order.
 * @method
 * @memberof queryBuilder#
 * @param {number} latdivs - the number of latitude divisions in the grid
 * @param {number} londivs - the number of longitude divisions in the grid
 * @param {queryBuilder.LatLon} south - the south coordinate of the box
 * @param {queryBuilder.LatLon} west - the west coordinate for the box
 * @param {queryBuilder.LatLon} north - the north coordinate for the box
 * @param {queryBuilder.LatLon} east - the east coordinate for the box
 * @returns {queryBuilder.HeatMapParam} the buckets for a geospatial facet
 */
function heatmap() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (argLen < 1) {
    throw new Error('no region or divisions for heat map');
  }

  var hmap = {};
  switch(argLen) {
  case 3:
    var first  = args[0];
    var second = args[1];
    var third  = args[2];
    var region = null;
    if (valcheck.isObject(first)) {
      region = first;
      hmap.latdivs = second;
      hmap.londivs = third;
    } else if (valcheck.isObject(third)) {
      region = third;
      hmap.latdivs = first;
      hmap.londivs = second;
    } else {
      throw new Error('no first or last region for heat map');
    }

    var keys = ['s', 'w', 'n', 'e'];
    for (var i=0; i < keys.length; i++) {
      var key   = keys[i];
      var value = region[key];
      if (!valcheck.isNullOrUndefined(value)) {
        hmap[key] = value;
        continue;
      } else {
        var altKey = null;
        switch(key) {
        case 's':
          altKey = 'south'; 
          break;
        case 'w':
          altKey = 'west'; 
          break;
        case 'n':
          altKey = 'north'; 
          break;
        case 'e':
          altKey = 'east'; 
          break;
        }
        value = (altKey !== null) ? region[altKey] : null;
        if (!valcheck.isNullOrUndefined(value)) {
          hmap[key] = value;
          continue;
        }
      }
      throw new Error('heat map does not have '+key+' key');
    }
    break;
  case 6:
    hmap.latdivs = args[0];
    hmap.londivs = args[1];
    hmap.s = args[2];
    hmap.w = args[3];
    hmap.n = args[4];
    hmap.e = args[5];
    break;
  default:
    throw new Error('could not assign parameters to heat map');
  }

  return {'heatmap': hmap};
}
/**
 * Options for a geospatial query returned by
 * the {@link queryBuilder#geoOptions} function.
 * @typedef {object} queryBuilder.GeoOptionsParam
 */
/**
 * Provides options modifying the default behavior of a
 * {@link queryBuilder#geoAttributePair},
 * {@link queryBuilder#geoElement},
 * {@link queryBuilder#geoElementPair},
 * {@link queryBuilder#geoProperty},
 * {@link queryBuilder#geoPropertyPair}, or
 * {@link queryBuilder#geoPath} query.
 * @method
 * @memberof queryBuilder#
 * @param {...string} options - options supported for geospatial queries
 * @returns {queryBuilder.GeoOptionsParam} options for the geospatial query
 */
function geoOptions() {
  return {'geo-option': mlutil.asArray.apply(null, arguments)};
}
/**
 * Specifies the latitude and longitude for a coordinate of the region
 * criteria for a geospatial query. The latitude and longitude can be
 * passed as individual numeric parameters or wrapped in an array
 * @method
 * @memberof queryBuilder#
 * @param {number} latitude - the north-south location
 * @param {number} longitude - the east-west location
 * @returns {queryBuilder.LatLon} a coordinate for a {queryBuilder.Region}
 */
function latlon() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length !== 2)
    throw new Error('incorrect parameters: '+args);
  return {latitude: args[0], longitude: args[1]};
}
/**
 * Builds a query that applies the subquery to document lock fragments by contrast
 * with the {@link queryBuilder#documentFragment} function.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query} query - the query that must match document lock fragments
 * @returns {queryBuilder.Query} a composable query
 */
function locksFragment() {  
  return {'locks-fragment-query': mlutil.first.apply(null, arguments)};
}
/**
 * Builds a query that matches the subqueries within a specified proximity.
 * @method
 * @memberof queryBuilder#
 * @param {...queryBuilder.Query} subquery - a word, value, range, geospatial,
 * or other query or a composer such as an or query.
 * @param {queryBuilder.number} [distance] - the maximum number of words
 * between any two matching subqueries
 * @param {queryBuilder.WeightParam} [weight] - a weight returned
 * by {@link queryBuilder#weight} to increase or decrease the score
 * of subqueries relative to other queries in the complete search
 * @param {queryBuilder.OrderParam} [ordering] - the ordering on the subqueries
 * returned from {@link queryBuilder#ordered}
 * @returns {queryBuilder.Query} a composable query
 */
function near() {
  var args = mlutil.asArray.apply(null, arguments);
  var query = {
    queries: []
  };
  var seekingDistance = true;
  var seekingOrdered = true;
  var seekingWeight = true;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (seekingOrdered && arg.ordered !== null && arg.ordered !== undefined) {
      query.ordered = arg.ordered;
      seekingOrdered = false;
    } else if (seekingWeight && arg.weight) {
      query.weight = arg.weight;
      seekingWeight = false;
    } else if (seekingDistance && valcheck.isNumber(arg)) {
      query.distance = arg;
      seekingDistance = false;
    } else if (arg instanceof Array){
      Array.prototype.push.apply(query.queries, arg);
    } else {
      query.queries.push(arg);
    }
  }
  return {'near-query': query};
}
/**
 * Builds a query that removes any documents matched by the subquery.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query} subquery - a word, value, range, geospatial,
 * or other query or a composer such as an or query.
 * @returns {queryBuilder.Query} a composable query
 */
function not() {  
  return {'not-query': mlutil.first.apply(null, arguments)};
}
/**
 * Builds a query where the matching content qualifies for the positive query
 * and does not qualify for the negative query. Positions must be enabled for indexes.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query} positiveQuery - a query that must match
 * the content
 * @param {queryBuilder.Query} negativeQuery - a query that must not match
 * the same content
 * @returns {queryBuilder.Query} a composable query
 */
function notIn() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    throw new Error('missing positive and negative queries: '+args);
  case 1:
    throw new Error('missing negative query: '+args);
  default:
    return {'not-in-query':{
      'positive-query': args[0],
      'negative-query': args[1]
    }};
  }
}
/**
 * Builds a query for the union intersection of subqueries.
 * @method
 * @memberof queryBuilder#
 * @param {...queryBuilder.Query} subquery - a word, value, range, geospatial,
 * or other query or a composer such as an and query.
 * @returns {queryBuilder.Query} a composable query
 */
function or() {
  return {'or-query':{
      queries: mlutil.asArray.apply(null, arguments)
    }};
}
/**
 * The ordering returned by the {@link queryBuilder#ordered} function.
 * @typedef {object} queryBuilder.OrderParam
 */
/**
 * Specifies ordering for an {@link queryBuilder#and} or
 * {@link queryBuilder#near} query.
 * @method
 * @memberof queryBuilder#
 * @param {boolean} isOrdered - whether subqueries are ordered
 * @returns {queryBuilder.OrderParam} a query flag for ordering
 */
function ordered() {
  return {ordered: mlutil.first.apply(null, arguments)};
}
/**
 * Specifies a path configured as an index over JSON or XML documents on the server.
 * @method
 * @memberof queryBuilder#
 * @param {string} pathExpression - the indexed path
 * @param {object} namespaces - bindings between the prefixes in the path and
 * namespace URIs
 * @returns {queryBuilder.IndexedName} an indexed name for specifying a query
 */
function pathIndex() {
  var args = mlutil.asArray.apply(null, arguments);
  var query = null;
  switch(args.length) {
  case 0:
    throw new Error('missing index: '+args);
  case 1:
    query = {
      text: args[0],
      namespaces: ''
    };
    break;
  default:
    query = {
      text: args[0],
      namespaces: args[1]
    };
    break;
  }
  return {'path-index': query};
}
/**
 * Specifies a point region either by passing the return value from
 * the {@link queryBuilder#latlon} function or by passing the latitude and longitude
 * numbers in that order (possibly wrapped in an array).
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.LatLon} coordinate - the point location
 * @returns {queryBuilder.Region} the region criteria for a geospatial query
 */
function point() {
  var args = mlutil.asArray.apply(null, arguments);
  var region = null;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    switch(i) {
    case 0:
      if (arg.latitude && arg.longitude) {
        region = arg;
      } else {
        region = {latitude: arg};
      }
      break;
    case 1:
      region.longitude = arg;
      break;
    default:
      throw new Error('unsupported parameter: '+arg);
    }
  }
  return {point: [region]};
}
/**
 * Specifies a polygon region as a list of coordinate parameters or as a coordinate array
 * where each coordinate is specified either by the return value from
 * the {@link queryBuilder#latlon} function or by wrapping the latitude and
 * longitude numbers in an array.
 * @method
 * @memberof queryBuilder#
 * @param {...queryBuilder.LatLon} coordinate - the polygon coordinates
 * @returns {queryBuilder.Region} the region criteria for a geospatial query
 */
function polygon() {
  var args = mlutil.asArray.apply(null, arguments);
  var points = [];
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (arg.point) {
      points.push(arg.point[0]);
    } else if (arg.latitude && arg.longitude) {
      points.push(arg);
    } else if (arg instanceof Array && arg.length === 2){
      points.push({latitude: arg[0], longitude: arg[1]});
    } else {
      throw new Error('unsupported parameter: '+arg);
    }
  }
  return {polygon:{point: points}};
}
/**
 * Builds a query that applies the subquery to document metadata by contrast
 * with the {@link queryBuilder#documentFragment} function.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query} query - the query that must match document metadata
 * properties
 * @returns {queryBuilder.Query} a composable query
 */
function properties() {  
  return {'properties-query': mlutil.first.apply(null, arguments)};
}
/**
 * Specifies a JSON property for a query.  As a shortcut, a JSON property
 * can also be specified with a string instead of calling this function.
 * @method
 * @memberof queryBuilder#
 * @param {string} name - the name of the property
 * @returns {queryBuilder.IndexedName} an indexed name for specifying a query
 */
function property() {
  return {'json-property': mlutil.first.apply(null, arguments)};
}
/**
 * A namespaced name for an element or attribute returned
 * by the {@link queryBuilder#qname} function.
 * @typedef {object} queryBuilder.QName
 */
/**
 * Specifies an XML qualified name.
 * @method
 * @memberof queryBuilder#
 * @param {string|string[]} parts - the namespace URI and name
 * for the QName supplied either as two strings or as an array with
 * two strings.
 * @returns {queryBuilder.QName} a QName for identifying
 * an element or attribute
 */
function qname() {
  return {qname: nsName.apply(null, arguments)};
}
/** @ignore */
function nsName() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    throw new Error('no name');
  case 1:
    return {name: args[0]};
  case 2:
    return {ns: args[0], name: args[1]};
  default:
    throw new Error('too many arguments: '+args.length);
  }
}
/**
 * The specification for a timespan or timestamp for an query
 * returned by the {@link queryBuilder#period} function.
 * @typedef {object} queryBuilder.PeriodParam
 */
/**
 * Specifies a timespan or timestamp for comparison with
 * a valid or system timespan in temporal documents in
 * a {@link queryBuilder#periodRange} temporal query.
 * @method
 * @memberof queryBuilder#
 * @param {string|Date} startTimestamp - the starting datetime for a timespan
 * or the datetime for a timestamp  
 * @param {string|Date} [endTimestamp] - the starting datetime for a timespan
 * or the datetime for a timestamp  
 * @returns {queryBuilder.PeriodParam} the specification of a period
 * for a {@link queryBuilder#periodRange} temporal query
 */
function period() {
  var startDate = null;
  var endDate   = null;

  var max = Math.min(arguments.length, 2);
  for (var i=0; i < max; i++) {
    var arg = arguments[i];
    if (valcheck.isDate(arg)) {
      arg = arg.toISOString();
    } else if (!valcheck.isString(arg)) {
      continue;
    }

    if (valcheck.length === 0) {
      continue;
    }

    switch (i) {
    case 0:
      startDate = arg;
      break;
    case 1:
      endDate = arg;
      break;
    }
  }

  if (valcheck.isNull(startDate)) {
    throw new Error('period must have at least one datetime');
  }
  var periodVal = {'period-start': startDate};

  if (!valcheck.isNull(endDate)) {
    periodVal['period-end'] = endDate;
  }

  return periodVal;
}
/**
 * Builds a query matching temporal documents based on the relationship
 * between the valid period and the system period.  For instance, this
 * query can find cases where what was believed to be true (the valid time)
 * was recorded (the system time) only afterward (the valid axis is before
 * the system axis).
 * @method
 * @memberof queryBuilder#
 * @param {string} axis1 - the configured name of the valid or system axis
 * @param {string} operator - the name of an Allen interval operator or
 * ISO SQL 2011 period operator
 * @param {string} axis2 - the configured name of the valid or system axis, which
 * must be different from axis1
 * @param {queryBuilder.TemporalOptionsParam} [temporalOptions] - a list
 * of options returned by {@link queryBuilder#temporalOptions} to modify
 * the temporal query
 * @returns {queryBuilder.Query} a composable query
 */
function periodCompare() {
  var argLen = arguments.length;

  var arg = (argLen > 2) ? arguments[0] : null;
  var compareAxis1 = valcheck.isString(arg) ? arg : null;

  arg = (argLen > 2) ? arguments[1] : null;
  var compareOperator = valcheck.isString(arg) ? arg : null;

  arg = (argLen > 2) ? arguments[2] : null;
  var compareAxis2 = valcheck.isString(arg) ? arg : null;

  arg = (argLen > 3) ? arguments[3] : null;
  arg = (!valcheck.isNullOrUndefined(arg)) ? arg['temporal-option'] : null;
  var temporalOption = (!valcheck.isNullOrUndefined(arg)) ? arg : null;

  if (valcheck.isNull(compareAxis1) || valcheck.isNull(compareOperator) ||
      valcheck.isNull(compareAxis2)) {
    throw new Error('period compare query must have axis1, operator, and axis2');
  }

  var query = {
      axis1:               compareAxis1,
      'temporal-operator': compareOperator,
      axis2:               compareAxis2
  };
  if (!valcheck.isNull(temporalOption)) {
    query['temporal-option'] = temporalOption;
  }

  return {'period-compare-query': query};
}
/**
 * Builds a query matching temporal documents based on the relationship
 * between the valid or system period and the specified period.
 * This query can find what was believed to be true (the valid time)
 * or was recorded (the system time) during a timespan or before or
 * after a time.
 * @method
 * @memberof queryBuilder#
 * @param {string} axis - the configured name of the valid or system axis
 * @param {string} operator - the name of an Allen interval operator or
 * ISO SQL 2011 period operator
 * @param {queryBuilder.PeriodParam} [period] - a timespan or timestamp
 * returned by {@link queryBuilder#period} to compare with the valid or
 * system time of temporal documents
 * @param {queryBuilder.TemporalOptionsParam} [temporalOptions] - a list
 * of options returned by {@link queryBuilder#temporalOptions} to modify
 * the temporal query
 * @returns {queryBuilder.Query} a composable query
 */
function periodRange() {
  var argLen = arguments.length;

  var arg = (argLen > 2) ? arguments[0] : null;
  var rangeAxis =
    valcheck.isArray(arg)  ? arg   :
    valcheck.isString(arg) ? [arg] :
    null;

  arg = (argLen > 2) ? arguments[1] : null;
  var rangeOperator = valcheck.isString(arg) ? arg : null;

  arg = (argLen > 2) ? arguments[2] : null;
  var rangePeriod =
    valcheck.isArray(arg) ? arg   :
    (!valcheck.isNullOrUndefined(arg['period-start'])) ? [arg] :
    null;

  arg = (argLen > 3) ? arguments[3] : null;
  arg = (!valcheck.isNullOrUndefined(arg)) ? arg['temporal-option'] : null;
  var temporalOption = (!valcheck.isNullOrUndefined(arg)) ? arg : null;

  if (valcheck.isNull(rangeAxis) || rangeAxis.length === 0 ||
      valcheck.isNull(rangeOperator) ||
      valcheck.isNull(rangePeriod) || rangePeriod.length === 0) {
    throw new Error('period range query must have axis, operator, and period');
  }

  var query = {
      axis:                rangeAxis,
      'temporal-operator': rangeOperator,
      period:              rangePeriod
  };
  if (!valcheck.isNull(temporalOption)) {
    query['temporal-option'] = temporalOption;
  }

  return {'period-range-query': query};
}
/**
 * Options for a temporal query returned by
 * the {@link queryBuilder#temporalOptions} function.
 * @typedef {object} queryBuilder.TemporalOptionsParam
 */
/**
 * Provides options modifying the default behavior of an
 * {@link queryBuilder#lsqtQuery}, 
 * {@link queryBuilder#periodCompare}, or
 * {@link queryBuilder#periodRange} query.
 * @method
 * @memberof queryBuilder#
 * @param {...string} options - options supported for temporal queries
 * @returns {queryBuilder.TemporalOptionsParam} options for the temporal query
 */
function temporalOptions() {
  return {'temporal-option': mlutil.asArray.apply(null, arguments)};
}
/**
 * Builds a query over a range index. You must supply
 * either a comparison operator with one or more values or a binding
 * to parse the comparison and value from a query string but not both.
 * You can provide both named and default bindings for the same query.
 * @method
 * @memberof queryBuilder#
 * @param {string|queryBuilder.IndexedName} indexedName - the JSON 
 * property, XML element or attribute, field, or path providing the values
 * to the range index
 * @param {queryBuilder.DatatypeParam} [datatype] - a datatype returned
 * by the {@link queryBuilder#datatype} to identify the index
 * @param {string} [comparison] - an operator from the enumeration
 * =|!=|<|<=|>|>= defaulting to the = (equivalence) operator
 * @param [...value] - one or more values for comparison with the indexed values
 * @param {queryBuilder.BindingParam} [binding] - a binding
 * (returned by the {@link queryBuilder#bind} function) for parsing the
 * comparison operator and value from tagged values in a query string 
 * @param {queryBuilder.DefaultBindingParam} [defaultBinding] - a binding
 * (returned by the {@link queryBuilder#bindDefault} function) for parsing
 * the comparison operator and value from untagged values in a query string 
 * @param {queryBuilder.FragmentScopeParam} [fragmentScope] - whether the query
 * applies to document content (the default) or document metadata properties
 * as returned by the {@link queryBuilder#fragmentScope} function
 * @param {queryBuilder.RangeOptionsParam} [options] - options
 * from {@link queryBuilder#rangeOptions} modifying the default behavior
 * @returns {queryBuilder.Query} a composable query
 */
function range() {
  var args = mlutil.asArray.apply(null, arguments);
  var constraint = {};
  var constraintIndex = null;
  var values = null;
  var operator = null;
  var seekingDatatype = true;
  var seekingFragmentScope = true;
  var seekingRangeOption = true;
  var constraintName;
  var defaultConstraint;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (i === 0) {
      constraintIndex = asIndex(arg);
      addIndex(constraint, constraintIndex, false);
    } else if (seekingDatatype && arg.datatype !== undefined) {
      constraint.type = arg.datatype;
      if (arg.collation !== undefined) {
        constraint.collation = arg.collation;
      }
      seekingDatatype = false;
    } else if (seekingFragmentScope && arg['fragment-scope'] !== undefined) {
      constraint['fragment-scope'] = arg['fragment-scope'];
      seekingFragmentScope = false;
    } else if (seekingRangeOption && arg['range-option'] !== undefined) {
      constraint['range-option'] = arg['range-option'];
      seekingRangeOption = false;
    } else if (arg instanceof Array){
      if (values === null) {
        values = arg;
      } else {
        Array.prototype.push.apply(values, arg);        
      }
    } else if ((seekingDatatype || operator === null) && valcheck.isString(arg)) {
      var testType = (seekingDatatype) ? datatypes[arg.trim()] : null;
      if (testType) {
        constraint.type = testType;
        seekingDatatype = false;
      } else {
        var testComp = (operator === null) ? comparisons[arg.trim()] : null;
        if (testComp !== null && testComp !== undefined) {
          operator = testComp;
        } else if (values === null) {
          values = [arg];
        } else {
          values.push(arg);
        }
      }
    } else {
      if (constraintName === undefined) {
        constraintName = arg.constraintName;
        if (constraintName !== undefined) {
          continue;
        }
      }
      if (defaultConstraint === undefined) {
        defaultConstraint = arg.defaultConstraint;
        if (defaultConstraint !== undefined) {
          continue;
        }
      }
      if (values === null) {
        values = [arg];
      } else {
        values.push(arg);
      }
    }
  }

  var wrapper = {};
  if (values !== null) {
    if (constraintName === undefined) {
      constraint.value = values;
      constraint['range-operator'] = (operator !== null) ? operator : 'EQ';
      wrapper['range-query'] = constraint;
    } else {
      throw new Error('range has both binding and query: '+args);
    }
  } else if (defaultConstraint !== undefined) {
    wrapper['default'] = {range: constraint};
  } else {
    if (constraintName === undefined) {
      constraintName = defaultConstraintName(constraintIndex);
      if (constraintName === null) {
        throw new Error('could not default constraint name from '+
            Object.keys(constraintIndex).join(', ') + ' index'
            );
      }
    }
    wrapper.name = constraintName;
    wrapper.range = constraint;
  }

  return wrapper;
}
/**
 * Options for a range query returned by the {@link queryBuilder#rangeOptions}
 * function.
 * @typedef {object} queryBuilder.RangeOptionsParam
 */
/**
 * Provides options modifying the default behavior
 * of a {@link queryBuilder#range} query.
 * @method
 * @memberof queryBuilder#
 * @param {...string} options - options supported for range queries
 * @returns {queryBuilder.RangeOptionsParam} options for a {@link queryBuilder#range} query
 */
function rangeOptions() {
  return {'range-option': mlutil.asArray.apply(null, arguments)};
}
/**
 * Specifies the coordinates of a box as a list of parameters
 * for passing to the {@link queryBuilder#box} function
 * or to the {@link queryBuilder#heatmap} function
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.LatLon} south - the south coordinate
 * @param {queryBuilder.LatLon} west - the west coordinate
 * @param {queryBuilder.LatLon} north - the north coordinate
 * @param {queryBuilder.LatLon} east - the east coordinate
 * @returns {object} the coordinates for the box
 */
function southWestNorthEast() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length !== 4) {
    throw new Error('incorrect parameters: '+args);
  }
  return {south: args[0], west: args[1], north: args[2], east: args[3]};
}
/**
 * Builds a query for matching words in a JSON, text, or XML document.
 * @method
 * @memberof queryBuilder#
 * @param {string} [...text] - one or more words to match
 * @param {queryBuilder.WeightParam} [weight] - a weight returned
 * by {@link queryBuilder#weight} to increase or decrease the score
 * of the query relative to other queries in the complete search
 * @returns {queryBuilder.Query} a composable query
 */
function term() {
  var args = mlutil.asArray.apply(null, arguments);
  var query = {
      text: []
  };
  var seekingWeight = true;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (seekingWeight && arg.weight) {
      query.weight = arg.weight;
      seekingWeight = false;
    } else if (arg instanceof Array){
      Array.prototype.push.apply(query.text, arg);
    } else if (seekingWeight && valcheck.isNumber(arg)) {
      query.weight = arg;
      seekingWeight = false;
    } else {
      query.text.push(arg);
    }
  }
  return {'term-query': query};
}
/**
 * Options for a range query returned by the {@link queryBuilder#termOptions}
 * function.
 * @typedef {object} queryBuilder.TermOptionsParam
 */
/**
 * Provides options modifying the default behavior
 * of a {@link queryBuilder#value} or {@link queryBuilder#word} query.
 * @method
 * @memberof queryBuilder#
 * @param {...string} options - options supported for value or word queries
 * @returns {queryBuilder.TermOptionsParam} options for a value or word query
 */
function termOptions() {
  return {'term-option': mlutil.asArray.apply(null, arguments)};
}
/** @ignore */
function textQuery(variant, args) {
  var constraint = {};
  var constraintIndex = null;
  var text = null;
  var seekingFragmentScope = true;
  var seekingTermOption = true;
  var seekingWeight = true;
  var constraintName;
  var defaultConstraint;
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    if (i === 0) {
      constraintIndex = asIndex(arg);
      addIndex(constraint, constraintIndex, false);
    } else if (seekingFragmentScope && arg['fragment-scope']) {
      constraint['fragment-scope'] = arg['fragment-scope'];
      seekingFragmentScope = false;
    } else if (seekingTermOption && arg['term-option']) {
      constraint['term-option'] = arg['term-option'];
      seekingTermOption = false;
    } else if (seekingWeight && arg.weight) {
      constraint.weight = arg.weight;
      seekingWeight = false;
    } else if (arg instanceof Array) {
      if (text === null) {
        text = arg;
      } else {
        Array.prototype.push.apply(text, arg);        
      }
    } else {
      if (constraintName === undefined) {
        constraintName = arg.constraintName;
        if (constraintName !== undefined) {
          continue;
        }
      }
      if (defaultConstraint === undefined) {
        defaultConstraint = arg.defaultConstraint;
        if (defaultConstraint !== undefined) {
          continue;
        }
      }
      if (text === null) {
        text = [arg];
      } else {
        text.push(arg);
      }
    }
  }

  var wrapper = {};
  if (text !== null) {
    if (constraintName === undefined) {
      constraint.text = text;
      wrapper[variant+'-query'] = constraint;
    } else {
      throw new Error(variant+' has both binding and query: '+args);      
    }
  } else if (defaultConstraint !== undefined) {
    var nested = {};
    nested[variant] = constraint;
    wrapper['default'] = nested;
  } else {
    if (constraintName === undefined) {
      constraintName = defaultConstraintName(constraintIndex);
      if (constraintName === null) {
        throw new Error('could not default constraint name from '+
            Object.keys(constraintIndex).join(', ') + ' index'
            );
      }
    }
    wrapper.name = constraintName;
    wrapper[variant] = constraint;
  }
  
  return wrapper;
}

/**
 * Builds a query for matching the entire text value contained by a JSON property
 * or XML element.
 * You must supply either one or more text values or a binding to parse the text
 * value from a query string but not both. You can provide both named and
 * default bindings for the same query.
 * @method
 * @memberof queryBuilder#
 * @param {string|queryBuilder.IndexedName} indexedName - the JSON 
 * property, XML element, field, or path containing the value
 * @param {string} [...text] - one or more values to match
 * @param {queryBuilder.BindingParam} [binding] - a binding
 * (returned by the {@link queryBuilder#bind} function) for parsing the text value
 * from tagged values in a query string 
 * @param {queryBuilder.DefaultBindingParam} [defaultBinding] - a binding
 * (returned by the {@link queryBuilder#bindDefault} function) for parsing
 * the text value from untagged values in a query string 
 * @param {queryBuilder.WeightParam} [weight] - a weight returned
 * by {@link queryBuilder#weight} to increase or decrease the score
 * of the query relative to other queries in the complete search
 * @param {queryBuilder.FragmentScopeParam} [fragmentScope] - whether the query
 * applies to document content (the default) or document metadata properties
 * as returned by the {@link queryBuilder#fragmentScope} function
 * @param {queryBuilder.TermOptionsParam} [options] - options
 * from {@link queryBuilder#termOptions} modifying the default behavior
 * @returns {queryBuilder.Query} a composable query
 */
function value() {
  return textQuery('value', mlutil.asArray.apply(null, arguments));
}
/**
 * The weight modification returned by the {@link queryBuilder#weight} function.
 * @typedef {object} queryBuilder.WeightParam
 */
/**
 * Increases or decreases the contribution of the query relative
 * to other queries in the result documents ranking.
 * @method
 * @memberof queryBuilder#
 * @param {number} modifier - a number between -16 and 64 modifying
 * the contribution of the query to the score
 * @returns {queryBuilder.WeightParam} a query flag for weight
 */
function weight() {
  return {weight: mlutil.first.apply(null, arguments)};
}
/**
 * Builds a query for matching the word contained by a JSON property
 * or XML element.
 * You must supply either one or more words or a binding to parse the words
 * from a query string but not both. You can provide both named and
 * default bindings for the same query.
 * @method
 * @memberof queryBuilder#
 * @param {string|queryBuilder.IndexedName} indexedName - the JSON 
 * property, XML element, field, or path containing the word 
 * @param {string} [...text] - one or more words to match
 * @param {queryBuilder.BindingParam} [binding] - a binding
 * (returned by the {@link queryBuilder#bind} function) for parsing the word
 * from tagged word s in a query string 
 * @param {queryBuilder.DefaultBindingParam} [defaultBinding] - a binding
 * (returned by the {@link queryBuilder#bindDefault} function) for parsing
 * the word from untagged words in a query string 
 * @param {queryBuilder.WeightParam} [weight] - a weight returned
 * by {@link queryBuilder#weight} to increase or decrease the score
 * of the query relative to other queries in the complete search
 * @param {queryBuilder.FragmentScopeParam} [fragmentScope] - whether the query
 * applies to document content (the default) or document metadata properties
 * as returned by the {@link queryBuilder#fragmentScope} function
 * @param {queryBuilder.TermOptionsParam} [options] - options
 * from {@link queryBuilder#termOptions} modifying the default behavior
 * @returns {queryBuilder.Query} a composable query
 */
function word() {
  return textQuery('word', mlutil.asArray.apply(null, arguments));
}

function QueryBuilder() {
}
QueryBuilder.prototype.where       = where;
QueryBuilder.prototype.calculate   = calculate;
QueryBuilder.prototype.orderBy     = orderBy;
QueryBuilder.prototype.slice       = slice;
QueryBuilder.prototype.withOptions = withOptions;

/**
 * An object representing the result of building a query using
 * the helper functions of a {@link queryBuilder}. 
 * @namespace queryBuilder.BuiltQuery
 */

/**
 * Initializes a new query builder by copying any where, calculate,
 * orderBy, slice, or withOptions clause defined in the built query.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.BuiltQuery} query - an existing query with
 * clauses to copy
 * @returns {queryBuilder.BuiltQuery} a built query
 */
function copyFromQueryBuilder(otherQueryBuilder) {
  var qb = new QueryBuilder();
  if (!valcheck.isNullOrUndefined(otherQueryBuilder)) {
    var clauseKeys = [
      'whereClause', 'calculateClause', 'orderByClause',
      'sliceClause', 'withOptionsClause'
    ];
    var isString = valcheck.isString(otherQueryBuilder);
    var other = isString ?
        JSON.parse(otherQueryBuilder) : otherQueryBuilder;
    for (var i=0; i < clauseKeys.length; i++){
      var key = clauseKeys[i];
      var value = other[key];
      if (!valcheck.isNullOrUndefined(value)) {
        // deepcopy instead of clone to avoid preserving prototype
        qb[key] = isString ? value : deepcopy(value);
      }
    }
  }
  return qb;
}

/**
 * Sets the where clause of a built query, using the helper functions
 * of a {@link queryBuilder} to specify a query by example, structured
 * query, or string query. This function may be called on a query builder
 * or on the result of building a query.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query|queryBuilder.ParsedQuery|queryBuilder.QueryByExample} [query] - either
 * one or more composable queries returned by query builder functions,
 * a parsed query returned by the {@link queryBuilder#parsedFrom} function, or
 * a query by example returned by the {@link queryBuilder#byExample} function.
 * @returns {queryBuilder.BuiltQuery} a built query
 */
function where() {
  var self = (this instanceof QueryBuilder) ? this : new QueryBuilder();

  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  // TODO: if empty, clear the clause

  var parsedQuery;
  var fragmentScope;
  var queries = null;

  var isQBE = false;
  switch(argLen) {
  case 0:
    self.whereClause = {query: {queries: [and()]}};
    break;
  case 1:
    var firstQuery = args[0];
    if (firstQuery.$query !== undefined) {
      isQBE = true;
      self.whereClause = firstQuery;
    } else {
      var firstWhereClause = {};
      parsedQuery = firstQuery.parsedQuery;
      if (parsedQuery === undefined) {
        firstWhereClause.query = {queries: args};
      } else {
        firstWhereClause.parsedQuery = parsedQuery;
      }
      self.whereClause = firstWhereClause;
    }
    break;
  default:
    for (var i=0; i < argLen; i++) {
      var arg = args[i];
      if (parsedQuery === undefined) {
        parsedQuery = arg.parsedQuery;
        if (parsedQuery !== undefined) {
          continue;
        }
      }
      if (fragmentScope === undefined) {
        fragmentScope = arg['fragment-scope'];
        if (fragmentScope !== undefined) {
          continue;
        }
      }
      if (queries === null) {
        queries = [arg];
      } else {
        queries.push(arg);        
      }
    }
    var whereClause = {};
    if (queries !== null) {
      whereClause.query = {queries: queries};
    }
    if (parsedQuery !== undefined) {
      whereClause.parsedQuery = parsedQuery;
    }
    if (fragmentScope !== undefined) {
      whereClause['fragment-scope'] = fragmentScope;
    }
    self.whereClause = whereClause;

    break;
  }

  self.queryType   = (isQBE) ? 'qbe' : 'structured';
  self.queryFormat = 'json';

  return self;
}

/**
 * A query definition returned by the {@link queryBuilder#byExample} function
 * to pass to a {@link queryBuilder#where} function.
 * @typedef {object} queryBuilder.QueryByExample
 */
/**
 * Builds a query by example from one or more objects that annotate instances
 * of properties to match.
 * @method
 * @memberof queryBuilder#
 * @param {object} ...query - one or more objects with example properties
 * @returns {queryBuilder.QueryByExample} a query
 * for the {@link queryBuilder#where} function 
 */
function byExample() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
    return {$query: []};
  case 1:
    var query = args[0];
    if (valcheck.isNullOrUndefined(query.$query)) {
      return {$query: query};
    }
    return query;
  default:
    return {$query: args};
  }
}

/**
 * Sets the orderBy clause of a built query, using the helper functions
 * of a {@link queryBuilder} to specify the sequence and direction
 * of sorting. This function may be called on a query builder or
 * on the result of building a query.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.IndexedName|queryBuilder.Score|queryBuilder.Sort} ...sortItem - a
 * JSON property, XML element or attribute, field, or path with a range index
 * or the relevance ranking of the document returned
 * by the {@link queryBuilder#score} function, where either may be returned
 * from the {@link queryBuilder#sort} function to indicate the sort direction.
 * @returns {queryBuilder.BuiltQuery} a built query
 */
function orderBy() {
  var self = (this instanceof QueryBuilder) ? this : new QueryBuilder();

  var args = mlutil.asArray.apply(null, arguments);
  // TODO: if empty, clear the clause

  var sortOrder = [];
  for (var i=0; i < args.length; i++) {
    var arg = args[i];
    sortOrder.push(valcheck.isString(arg) ? sort(arg) : arg);
  }

  self.orderByClause = {
    'sort-order': sortOrder
  };

  return self;
}

/**
 * A sort definition returned by the {@link queryBuilder#score} function
 * to pass to a {@link queryBuilder#orderBy} function.
 * @typedef {object} queryBuilder.Score
 */
/**
 * Specifies the relevance ranking for ordering documents
 * in the query results, optionally specifying the score method.
 * @method
 * @memberof queryBuilder#
 * @param {string} [method] - a scoring strategy from the enumeration
 * logtfidf|logtf|simple|random|zero, defaulting to logtfidf.
 * @returns {queryBuilder.Score} a sort definition
 * for the {@link queryBuilder#orderBy} function 
 */
function score() {
  return {
    score: (arguments.length === 0) ? null : arguments[0]
  };
}

/**
 * A sort definition returned by the {@link queryBuilder#sort} function
 * to pass to a {@link queryBuilder#orderBy} function.
 * @typedef {object} queryBuilder.Sort
 */
/**
 * Specifies the direction for sorting documents for a range index or
 * relevance score.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.IndexedName|queryBuilder.Score} sortItem - a
 * JSON property, XML element or attribute, field, or path with a range index
 * or the relevance ranking of the document returned
 * by the {@link queryBuilder#score} function.
 * @param {string} direction - a specification from the
 * ascending|descending enumeration.
 * @returns {queryBuilder.Sort} a sort definition
 * for the {@link queryBuilder#orderBy} function 
 */
function sort() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length === 0) {
    throw new Error('missing sorted index: '+args);
  }

  var firstIndex = asIndex(args[0]);
  // null is a legitimate value of score
  var isScore    = (!valcheck.isUndefined(firstIndex.score));

  var sorter = {};
  if (isScore) {
    sorter.score = firstIndex.score;
  } else {
    addIndex(sorter, firstIndex, false);
  }

  for (var i=1; i < args.length; i++) {
    var arg = args[i];
    if (valcheck.isString(arg)) {
      switch (arg) {
      case 'ascending':
      case 'descending':
        sorter.direction = arg;
        break;
      default:
        if (!isScore && /^xs:/.test(arg)) {
          sorter.type = arg;
        }
        break;
      }
    } else if (isScore) {
    } else if (!valcheck.isNullOrUndefined(arg.datatype)) {
      sorter.type = arg.datatype;
      if (!valcheck.isNullOrUndefined(arg.collation)) {
        sorter.collation = arg.collation;
      }
    } else if (!valcheck.isNullOrUndefined(arg.collation)) {
      sorter.type = 'xs:string';
      sorter.collation = arg.collation;
    }
  }

  return sorter;
}

/**
 * Specifies a transform for the documents or summary returned by a query
 * or the tuples list returned by a values query.
 * The transform must have been installed previously by 
 * the {@link config.transforms#write} function
 * @method
 * @memberof queryBuilder#
 * @param {string} name - the name of the transform
 * @param {object} params - the parameters of the transform
 * as key-value pairs
 * @returns {object} a transform definition
 * for the {@link queryBuilder#slice} function 
 */
function transform(name, params) {
  if (valcheck.isNullOrUndefined(name)) {
    throw new Error('transform without name');      
  }

  var transformList = [name];
  if (!valcheck.isNullOrUndefined(params)) {
    transformList.push(params);
  }

  return {'document-transform': transformList};
}

/**
 * Sets the slice clause of a built query to select a slice of documents
 * from the result set based on the start document within the result set 
 * and the number of documents in the slice.  (A slice is also sometimes
 * called a page of search results.)
 * @method
 * @memberof queryBuilder#
 * @param {number} start - the one-based position within the result set
 * of the first document or 0 to suppress the documents and return only
 * the summary.
 * @param {number} [length] - the number of documents in the slice.
 * @param {transform} [transform] - a transform to apply to each document
 * in the slice on the server as specified by the {@link queryBuilder#transform}
 * function.
 * @returns {queryBuilder.BuiltQuery} a built query
 */
function slice() {
  var self = (this instanceof QueryBuilder) ? this : new QueryBuilder();

  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  // TODO: if empty, clear the clause

  var sliceClause = {};

  var pageStart  = null;
  var pageLength = null;

  var argMax = Math.min(argLen, 3);
  var arg    = null;
  for (var i=0; i < argMax; i++) {
    arg = args[i];
    if (valcheck.isNumber(arg)) {
      switch(i) {
      case 0:
        pageStart = arg;
        break;
      case 1:
        pageLength = arg;
        break;
      }
    } else if (!valcheck.isUndefined(arg['transform-results'])) {
      sliceClause['transform-results'] = arg['transform-results'];
    } else if (!valcheck.isUndefined(arg['extract-document-data'])) {
      sliceClause['extract-document-data'] = arg['extract-document-data'];
    } else if (!valcheck.isUndefined(arg['document-transform'])) {
      sliceClause['document-transform'] = arg['document-transform'];
    }
  }

  if (pageStart !== null && pageLength !== 0) {
    if (pageStart === 0 && pageLength === null) {
      sliceClause['page-length'] = 0;
    } else {
      sliceClause['page-start'] = pageStart ;
    }
  }
  if (pageLength !== null) {
    sliceClause['page-length'] = pageLength;
  }

  self.sliceClause = sliceClause;

  return self;
}

/**
 * Sets the calculate clause of a built query, specifying JSON properties,
 * XML elements or attributes, fields, or paths with a range index for
 * value frequency or other aggregate calculation.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Facet} ...facets - the facets to calculate
 * over the documents in the result set as returned by
 * the {@link queryBuilder#facet} function.
 * @returns {queryBuilder.BuiltQuery} a built query
 */
function calculate() {
  var self = (this instanceof QueryBuilder) ? this : new QueryBuilder();

  var args = mlutil.asArray.apply(null, arguments);

  // TODO: distinguish facets and values
  var calculateClause = {
      constraint: args
  };
  
  self.calculateClause = calculateClause;

  return self;
}

/**
 * A facet definition returned by the {@link queryBuilder#facet} function
 * to pass to a {@link queryBuilder#calculate} function.
 * @typedef {object} queryBuilder.Facet
 */
/**
 * Specifies value frequency over a range index. The name of the facet can
 * also be used as a constraint to tag values in a parsed string query
 * (if supplied in the {@link queryBuilder#where} clause) and bind the values
 * to a range query.  
 * @method
 * @memberof queryBuilder#
 * @param {string} name - a name for the facet to identify the calculated
 * result and use as a constraint to tag values in a parsed query string
 * @param {queryBuilder.IndexedName} indexedName - a JSON property, 
 * XML element or attribute, field, or path with a range index.
 * @param {queryBuilder.BucketParam} [...bucket] - {@link queryBuilder#bucket} function
 * @param {queryBuilder.CalculateFunction} [custom] - the specification of a module
 * for a custom facet as returned by the {@link queryBuilder#calculateFunction} function
 * @param {queryBuilder.FacetOptionsParam} [options] - options
 * from {@link queryBuilder#facetOptions} modifying the default behavior
 * @returns {queryBuilder.Facet} a facet definition
 * for the {@link queryBuilder#calculate} function 
 */
function facet() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (argLen < 1) {
    throw new Error('facet must at a minimum identify the index');
  }

  var constraintName = null;
  var constraintIndex = null;
  var datatype;
  var facetOptions;
  var calculateFunction;
  var buckets = null;
  var computedBuckets = null;
  
  for (var i=0; i < argLen; i++) {
    var arg = args[i];
    switch(i) {
    case 0:
      if (valcheck.isString(arg)) {
        constraintName = arg;
      } else {
        constraintIndex = arg;
      }
      continue;
    case 1:
      if (!valcheck.isNullOrUndefined(arg['start-facet']) &&
          !valcheck.isNullOrUndefined(arg['finish-facet'])) {
        calculateFunction = arg;
        continue;
      }
      if (constraintIndex === null) {
        if (valcheck.isString(arg)) {
          constraintIndex = property(arg);
          continue;
        } else if (arg['json-property'] || arg.element || arg.field || arg['path-index'] ||
            arg.collection !== undefined) {
          constraintIndex = arg;
          continue;
        }
      }
    }
    if (datatype === undefined) {
      datatype = arg.datatype;
      if (datatype !== undefined) {
        continue;
      }
    }
    if (facetOptions === undefined) {
      facetOptions = arg['facet-option'];
      if (facetOptions !== undefined) {
        continue;
      }
    }
    if (calculateFunction === undefined &&
        !valcheck.isNullOrUndefined(arg['start-facet']) &&
        !valcheck.isNullOrUndefined(arg['finish-facet'])) {
      calculateFunction = arg;
      continue;
    }
    var bucket = arg.bucket;
    if (bucket !== undefined) {
      if (buckets === null) {
        buckets = [bucket];
      } else {
        buckets.push(bucket);
      }
      continue;
    }
    bucket = arg.computedBucket;
    if (bucket !== undefined) {
      if (computedBuckets === null) {
        computedBuckets = [bucket];
      } else {
        computedBuckets.push(bucket);
      }
      continue;
    }
  }
  if (constraintIndex === null) {
    constraintIndex = property(constraintName);
  } else if (constraintName === null) {
    constraintName = defaultConstraintName(constraintIndex);
    if (constraintName === null) {
      throw new Error('could not default constraint name from '+
          Object.keys(constraintIndex).join(', ') + ' index'
          );
    }
  }

  var facetWrapper = {name: constraintName};
  var constraint = {facet: true};
  if (constraintIndex.collection !== undefined) {
    facetWrapper.collection = constraint;
  } else if (calculateFunction !== undefined) {
    constraint['start-facet']  = calculateFunction['start-facet'];
    constraint['finish-facet'] = calculateFunction['finish-facet'];
    facetWrapper.custom = constraint;
  } else {
    facetWrapper.range = constraint;
    if (!valcheck.isNullOrUndefined(datatype)) {
      constraint.type = datatype;
    }
    var constraintKeys = Object.keys(constraintIndex);
    var constraintKeyLen = constraintKeys.length;
    for (var j=0; j < constraintKeyLen; j++) {
      var key = constraintKeys[j];
      constraint[key] = constraintIndex[key];
    }
    if (buckets !== null) {
      constraint.bucket = buckets;
    }
    if (computedBuckets !== null) {
      constraint['computed-bucket'] = computedBuckets;
    }
  }
  if (facetOptions !== undefined) {
    constraint['facet-option'] = facetOptions;    
  }

  return facetWrapper;
}

/**
 * The specification for a custom constraint facet generation module
 * as returned by {@link queryBuilder#calculateFunction} to pass
 * to the {@link queryBuilder#facet} function.
 * @typedef {object} queryBuilder.CalculateFunction
 */
/**
 * Specifies a module that generates a custom facet as an argument to the
 * {@link queryBuilder#facet} function.
 * The library must be installed as /ext/marklogic/query/custom/MODULE_NAME.xqy,
 * must have the http://marklogic.com/query/custom/MODULE_NAME namespace, and
 * must define the start-facet() and finish-facet() functions. The same module
 * can implement a parse() function for a custom parser specified with the 
 * {@link queryBuilder#parseFunction} helper.
 * @method
 * @memberof queryBuilder#
 * @param {string} moduleName - the name of the module with the functions
 * @returns {queryBuilder.CalculateFunction} the specification for a custom facet
 * module for the {@link queryBuilder#facet} function.
 */
function calculateFunction() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length < 1) {
    throw new Error('calculate function without module name');
  }

  var moduleName = args[0];

  var rootname = mlutil.rootname(moduleName);
  if (rootname === null) {
    throw new Error('library must have an extension of .xqy');
  }

  return {
      'start-facet': {
        apply: 'start-facet',
        ns:    'http://marklogic.com/query/custom/'+rootname,
        at:    '/ext/marklogic/query/custom/'+moduleName
      },
      'finish-facet': {
        apply: 'finish-facet',
        ns:    'http://marklogic.com/query/custom/'+rootname,
        at:    '/ext/marklogic/query/custom/'+moduleName
      }
  };
}

/**
 * Options for a facet calculation returned by the {@link queryBuilder#facetOptions}
 * function.
 * @typedef {object} queryBuilder.FacetOptionsParam
 */
/**
 * Provides options modifying the default behavior
 * of a {@link queryBuilder#facet} calculation.
 * @method
 * @memberof queryBuilder#
 * @param {...string} options - options supported for facet calculations
 * @returns {queryBuilder.FacetOptionsParam} options for a {@link queryBuilder#facet} calculation
 */
function facetOptions() {
  var args = mlutil.asArray.apply(null, arguments);
  if (args.length < 1) {
    throw new Error('no facet options');
  }
  return {'facet-option': args};
}

/**
 * The definition of a numeric or datetime range returned by the {@link queryBuilder#bucket} function
 * for aggregating value frequencies with a {@link queryBuilder#facet} function.
 * @typedef {object} queryBuilder.BucketParam
 */
/**
 * Defines a numeric or datetime range of for aggregating value frequencies
 * as part of a {@link queryBuilder#facet} calculation. To compute both lower and upper bounds
 * relative to the same anchor, you can as a convenience return both bounds and the separator
 * from a single call to an {@link queryBuilder#anchor} function.
 * @method
 * @memberof queryBuilder#
 * @param {string} name - the name of the bucket
 * @param [lower] - the lower numeric or datetime boundary, which is less than or equal to the values
 * in the bucket; omit the lower bound to specify a bucket for the smallest values;
 * return the lower bound from an {@link queryBuilder#anchor} function to compute a datetime boundary
 * relative to a temporal milestone 
 * @param {string} separator - the constant '<' separating the lower and upper bounds
 * @param [upper] - the upper numeric or datetime boundary, which is greater than the values
 * in the bucket; omit the upper bound to specify a bucket for the largest values;
 * return the upper bound from an {@link queryBuilder#anchor} function to compute a datetime boundary
 * relative to a temporal milestone 
 * @returns {queryBuilder.BucketParam} specification for a {@link queryBuilder#facet} calculation
 */
function bucket() {
  var bucketWrapper = {name: arguments[0], label: arguments[0]};
  switch(arguments.length) {
  case 0:
  case 1:
    break;
  case 2:
    var anchor = arguments[1].anchor;
    var value  = arguments[1].value;
    if (anchor && value instanceof Array) {
      bucketWrapper.anchor = anchor;
      var isBucket = (value.length === 2) ?
          twoValueBucket(bucketWrapper, value[0], value[1]) :
          threeValueBucket(bucketWrapper, null, value[0], value[1], null, value[2]);
      if (isBucket) {
        return {computedBucket: bucketWrapper};
      }
    }
    break;
  case 3:
    if (twoValueBucket(bucketWrapper, arguments[1], arguments[2])) {
      return {bucket: bucketWrapper};
    }
    break;
  case 4:
    var anchor1    = arguments[1].anchor;
    var value1     = (anchor1) ? arguments[1].value[0] : arguments[1];
    var comparator = arguments[2];
    var anchor2    = arguments[3].anchor;
    var value2     = (anchor2) ? arguments[3].value[0] : arguments[3];
    if (threeValueBucket(bucketWrapper, anchor1, value1, comparator, anchor2, value2)) {
      if (anchor1 || anchor2) {
        return {computedBucket: bucketWrapper};
      }
      return {bucket: bucketWrapper};
    }
    break;
  }
  throw new Error('a bucket must have a name, a comparison, and bounds (with or without anchors)');
}
/**
 * The specification for computing a datetime boundary or range as returned by
 * the {@link queryBuilder#anchor} function to pass to the {@link queryBuilder#bucket} function.
 * @typedef {object} queryBuilder.AnchorParam
 */
/**
 * Defines a numeric or datetime range of for aggregating value frequencies
 * as part of a {@link queryBuilder#facet} calculation. To compute both lower and upper bounds
 * relative to the same anchor, you can as a convenience return both bounds and the separator
 * from a single call to an {@link queryBuilder#anchor} function.
 * @method
 * @memberof queryBuilder#
 * @param {string} milestone - the temporal milestone from the enumeration
 * now|start-of-day|start-of-month|start-of-year
 * @param offset - a boundary as a duration offset relative to the temporal milestone
 * such as -P1Y for one year in the past, -P2D for two days in the past, and so on; formally,
 * an xs:duration, xs:yearMonthDuration, or xs:dayTimeDuration value
 * @param {string} [separator] - the constant '<' separating the lower and upper bounds; if the
 * separator is provided, the preceding offset must establish the lower bound and the following offset
 * must establish the upper bound
 * @param [upper] - the upper boundary as a duration offset relative to the temporal milestone
 * @returns {queryBuilder.AnchorParam} specification for a {@link queryBuilder#bucket}
 * as part of a facet calculation
 */
function anchor() {
  var args = mlutil.asArray.apply(null, arguments);
  switch(args.length) {
  case 0:
  case 1:
    break;
  case 2:
  case 3:
  case 4:
    return {
      anchor: args[0],
      value: args.slice(1)
    };
  default:
    break;
  }
  throw new Error('must specify anchor and at least one value');
}
/** @ignore */
function twoValueBucket(bucket, value1, value2) {
  if (     value1 === '<') { bucket.lt = value2; }
  else if (value2 === '>') { bucket.lt = value1; }
  else if (value1 === '>') { bucket.ge = value2; }
  else if (value2 === '<') { bucket.ge = value1; }
  else                     { return false;       }
  return true;
}
/** @ignore */
function threeValueBucket(bucket, anchor1, value1, comparator, anchor2, value2) {
  if (comparator === '<') {
    bucket.ge = value1;
    if (anchor1) {
      bucket['ge-anchor'] = anchor1;
    }
    bucket.lt = value2;
    if (anchor2) {
      bucket['lt-anchor'] = anchor2;
    }
  } else if (comparator === '>') {
    bucket.lt = value1;
    if (anchor1) {
      bucket['lt-anchor'] = anchor1;
    }
    bucket.ge = value2;
    if (anchor2) {
      bucket['ge-anchor'] = anchor2;
    }
  } else {
    return false;
  }
  return true;
}
/** @ignore */
function defaultConstraintName(index) {
  var indexdef = index['json-property'];
  if (indexdef !== undefined) {
    return indexdef;
  }
  indexdef = index.field;
  if (indexdef !== undefined) {
    return indexdef;
  }
  indexdef = index.element;
  if (indexdef !== undefined && index.attribute === undefined) {
    return indexdef.name;
  }
  return null;
}

/**
 * A query definition returned by the {@link queryBuilder#parsedFrom} function
 * to pass to a {@link queryBuilder#where} function.
 * @typedef {object} queryBuilder.ParsedQuery
 */
/**
 * Builds a parsed query from a string and bindings of constraint tags
 * to queries. The query parsing occurs on the server.
 * @method
 * @memberof queryBuilder#
 * @param {string} query - the string to parse
 * @param {queryBuilder.ParseBindings} bindings - the mappings of constraint names to queries
 * as returned by the {@link queryBuilder#parseBindings} function
 * @returns {queryBuilder.ParsedQuery} a query for
 * the {@link queryBuilder#where} function 
 */
function parsedFrom() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (arguments.length < 1) {
    throw new Error('no query text');
  }

  var parsedQuery = {qtext: args[0]};
  var constraints;
  var term;
  for (var i=1; i < argLen; i++) {
    var arg = args[i];
    if (constraints === undefined) {
      constraints = arg.constraint;
      if (constraints !== undefined) {
        parsedQuery.constraint = constraints;
      }
    }
    if (term === undefined) {
      term = arg.term;
      if (term !== undefined) {
        parsedQuery.term = term;
      }
    }
  }

  return {parsedQuery: parsedQuery};
}

/**
 * Mappings of constraint names to queries as returned
 * by the {@link queryBuilder#parseBindings} function
 * to pass to a {@link queryBuilder#parsedFrom} function
 * for tagging values within the query string.
 * @typedef {object} queryBuilder.ParseBindings
 */
/**
 * Maps constraint names to queries and passed to
 * a {@link queryBuilder#parsedFrom} function
 * for tagging values within the query string.
 * The query parsing occurs on the server.
 * @method
 * @memberof queryBuilder#
 * @param {queryBuilder.Query|queryBuilder.ParseFunction} ...query - queries that contain a binding
 * to a constraint name as returned by the {@link queryBuilder#bind} (instead of
 * specifying the criteria directly in the query) or that supply a custom constraint parsing
 * function to generate the query as returned by the {@link queryBuilder#parseFunction}
 * @param {queryBuilder.EmptyBindingParam} [emptyBinding] - specifies whether an
 * empty string matches no documents or all documents as returned
 * by the {@link queryBuilder#bindEmptyAs} function
 * @returns {queryBuilder.ParseBindings} a list of constraint bindings for
 * the {@link queryBuilder#parsedFrom} function
 */
function parseBindings() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (argLen < 1) {
    throw new Error('no bindings for the query text');
  }

  var bindings = {};

  var constraints;
  var defaultConstraints;
  var empty;
  var term;
  for (var i=0; i < argLen; i++) {
    var arg = args[i];
    if (arg.name !== undefined) {
      if (constraints === undefined) {
        constraints = [arg];
        bindings.constraint = constraints;
      } else {
        constraints.push(arg);
      }
      continue;
    }
    if (defaultConstraints === undefined) {
      defaultConstraints = arg['default'];
      if (defaultConstraints !== undefined) {
        if (term === undefined) {
          term = {};
          bindings.term = term;
        }
        term['default'] = defaultConstraints;
        continue;
      }
    }
    if (empty === undefined) {
      empty = arg.empty;
      if (empty !== undefined) {
        if (term === undefined) {
          term = {};
          bindings.term = term;
        }
        term.empty = empty;
        continue;
      }
    }    
    // TODO: special handling for custom
  }

  return bindings;
}
/**
 * A binding returned by the {@link queryBuilder#bind} function
 * for parsing a query string. The binding declares a constraint name
 * that tags the values in the query string and occupies the position
 * of the values in a query.
 * @typedef {object} queryBuilder.BindingParam
 */
/**
 * Specifies a constraint name that binds values provided by a parsed
 * query string to a query. The values are tagged with the constraint
 * name in the query string. The binding occupies the position of the
 * values in the query specification.
 * @method
 * @memberof queryBuilder#
 * @param {string} parts - the constraint name
 * @returns {queryBuilder.BindingParam} the binding for the constraint name
 */
function bind() {
  if (arguments.length === 0) {
    throw new Error('no name to bind as a constraint');
  }
  return {constraintName: arguments[0]};
}
/**
 * A binding returned by the {@link queryBuilder#bindDefault} function
 * for parsing a query string. The binding associates untagged values
 * in the query string with a query, occupying the position of the
 * values in a query. A search can have only one default binding.
 * @typedef {object} queryBuilder.DefaultBindingParam
 */
/**
 * Binds untagged values provided by a parsed query string to a query. The
 * binding occupies the position of the values in the query specification.
 * A search can have only one default binding.
 * @method
 * @memberof queryBuilder#
 * @returns {queryBuilder.DefaultBindingParam} the binding for the constraint name
 */
function bindDefault() {
  return {defaultConstraint: true};
}
/**
 * A specification whether an empty query string should be bound
 * to a query for no documents or all documents as returned
 * by the {@link queryBuilder#bindEmptyAs} function.
 * @typedef {object} queryBuilder.EmptyBindingParam
 */
/**
 * Binds an empty query string to no documents or all documents.
 * @method
 * @memberof queryBuilder#
 * @param {string} apply - a function from the all-results|no-results
 * enumeration to control whether empty criteria matches all or no results
 * @returns {queryBuilder.EmptyBindingParam} the binding for an empty string
 * to pass to the {@link queryBuilder#parseBindings} function
 */
function bindEmptyAs() {
  if (arguments.length === 0) {
    throw new Error('no name to bind as a constraint');
  }
  return {'empty':{'apply': arguments[0]}};
}
/**
 * The specification for a custom constraint parsing module as returned by
 * {@link queryBuilder#parseFunction} to pass
 * to the {@link queryBuilder#parseBindings} function.
 * @typedef {object} queryBuilder.ParseFunction
 */
/**
 * Specifies a custom constraint module that parses a tagged value as an argument
 * to the {@link queryBuilder#parseBindings} function.
 * The library must be installed as /ext/marklogic/query/custom/MODULE_NAME.xqy,
 * must have the http://marklogic.com/query/custom/MODULE_NAME namespace, and
 * must define the parse() function. The same module can implement start-facet()
 * and finish-facet() functions for a custom facet specified with the 
 * {@link queryBuilder#calculateFunction} helper.
 * @method
 * @memberof queryBuilder#
 * @param {string} moduleName - the name of the module with the function
 * @returns {queryBuilder.ParseFunction} the specification for a custom parsing
 * module for the {@link queryBuilder#parseBindings} function.
 */
function parseFunction() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (argLen < 2) {
    throw new Error('query parse function without module name or binding');
  }

  var moduleName = args[0];

  var rootname = mlutil.rootname(moduleName);
  if (rootname === null) {
    throw new Error('library must have an extension of .xqy');
  }

  var constraint = {
      parse: {
        apply: 'parse',
        ns:    'http://marklogic.com/query/custom/'+rootname,
        at:    '/ext/marklogic/query/custom/'+moduleName
      },
      facet: false
  };

  var seekingTermOption = true;
  var constraintName;
  for (var i=1; i < args.length; i++) {
    var arg = args[i];
    if (seekingTermOption && arg['term-option']) {
      constraint['term-option'] = arg['term-option'];
      seekingTermOption = false;
    } else {
      if (constraintName === undefined) {
        constraintName = arg.constraintName;
      }
    }
  }

  if (!valcheck.isString(constraintName)) {
    throw new Error('query parse function without a binding to a constraint name');
  }

  return {
    name:   constraintName,
    custom: constraint
    };
}

/**
 * Specifies JSON properties or XML elements to project from the
 * documents returned by a query.
 * @method
 * @memberof queryBuilder#
 * @param {string|string[]} paths - restricted XPaths (valid for
 * the cts:valid-index-path() function) to match in documents
 * @param {object} [namespaces] - for XPaths using namespaces,
 * an object whose properties specify the prefix as the key and
 * the uri as the value
 * @param {string} [selected] - specifies how to process
 * the selected JSON properties or XML elements where
 * include (the default) lists the selections,
 * include-ancestors projects a sparse document with
 * the selections and their ancesors, and
 * exclude suppresses the selections to projects a sparse document
 * with the sibilings and ancestors of the selections.
 * @returns {object} a extract definition
 * for the {@link queryBuilder#slice} function 
 */
function extract() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;
  if (argLen < 1) {
    throw new Error('must specify paths to extract');
  }

  var extractdef = {};

  var arg = args[0];
  if (valcheck.isString(arg)) {
    extractdef['extract-path'] = args;
  } else {
    var paths = arg.paths;
    if (valcheck.isString(paths)) {
      extractdef['extract-path'] = [paths];
    } else if (valcheck.isArray(paths)) {
      extractdef['extract-path'] = paths;
    } else if (valcheck.isUndefined(paths)) {
      throw new Error('first argument does not have key for paths to extract');    
    }
    
    var namespaces = arg.namespaces;
    if (!valcheck.isUndefined(namespaces)) {
      extractdef.namespaces = namespaces;
    }

    var selected = arg.selected;
    if (!valcheck.isUndefined(selected)) {
      extractdef.selected = selected;
    }
  }

  return {'extract-document-data': extractdef};
}

/**
 * Specifies a function for getting snippets with highlighted
 * matching text and contextual preceding and following text
 * from the documents returned by a query. You can specify
 * a built-in snippeting function or custom snippeting library.
 * The custom snippeting library must have been installed previously
 * by the {@link config.query.snippet#write} function
 * @method
 * @memberof queryBuilder#
 * @param {string} name - either the name of a builtin snippeting
 * function from the empty|metadata|snippet enumeration (where
 * snippet is the default) or the filename without path
 * for a custom snippeting library
 * @param {object} [options] - the configuration options
 * for a built-in snippeting function including
 * 'per-match-tokens', 'max-matches', 'max-snippet-chars',
 * and 'preferred-matches'; you cannot specify options or
 * parameters for a custom snippeting library
 * @returns {object} a snippet definition
 * for the {@link queryBuilder#slice} function 
 */
function snippet() {
  var args = mlutil.asArray.apply(null, arguments);
  var argLen = args.length;

  var builtins = {
      empty:              'empty-snippet',
      'empty-snippet':    'empty-snippet',
      metadata:           'metadata-snippet',
      'metadata-snippet': 'metadata-snippet',
      snippet:            'snippet'
  };

  var snippeter = {
      apply: 'snippet'
  };

  var argMax = Math.min(argLen, 2);
  var arg = null;
  var builtin = null;
  for (var i=0; i < argMax; i++) {
    arg = args[i];
    if (valcheck.isString(arg)) {
      builtin = builtins[arg];
      if (!valcheck.isUndefined(builtin)) {
        snippeter.apply = builtin;
      } else {
        var rootname = mlutil.rootname(arg);
        snippeter.ns    = 'http://marklogic.com/snippet/custom/'+rootname;
        snippeter.at    = '/ext/marklogic/snippet/custom/'+arg;
        snippeter.apply = 'snippet';
      }
    } else {
      mlutil.copyProperties(arg, snippeter);
    }
  }

  return {'transform-results': snippeter};
}

/**
 * Sets the withOptions clause of a built query to configure the query;
 * takes a configuration object with the following named parameters.
 * This function may be called on a query builder or on the result of building a query.
 * @method
 * @memberof queryBuilder#
 * @param {documents.categories}  [categories] - the categories of information
 * to retrieve for the result documents
 * @param {number} [concurrencyLevel] - the maximum number of threads to use to calculate facets
 * @param {...string} [forestNames] - the names of forests providing documents
 * for the result set
 * @param {...string} [search] - options modifying the default behaviour of the query
 * @param {string}  [txid] - the transaction id for an open transaction
 * @param {number} [weight] - a weighting factor between -16 and 64
 * @param {boolean} [debug] - whether to return query debugging 
 * @param {boolean} [metrics] - whether to return metrics for the query performance
 * @param {boolean} [queryPlan] - whether to return a plan for the execution of the query
 * @param {boolean} [similarDocs] - whether to return a list of URIs for documents
 * similar to each result
 * @returns {queryBuilder.BuiltQuery} a built query
 */
function withOptions() {
  var self = (this instanceof QueryBuilder) ? this : new QueryBuilder();

  // TODO: share with documents.js
  var optionKeyMapping = {
    search:'search-option',     weight:'quality-weight',
    forestNames:'forest-names', similarDocs:'return-similar',
    metrics:'return-metrics',   queryPlan:'return-plan',
    debug:'debug',              concurrencyLevel:'concurrency-level',
    categories:true,            txid:true
  };

  var withOptionsClause = {};
  if (0 < arguments.length) {
    var arg = arguments[0];
    var argKeys = Object.keys(arg);
    for (var i=0; i < argKeys.length; i++) {
      var key = argKeys[i];
      if (optionKeyMapping[key] !== undefined) {
        var value = arg[key];
        if (value !== undefined) {
          withOptionsClause[key] = value;
        }
      }
    }
  }
  self.withOptionsClause = withOptionsClause;

  return self;
}

module.exports = {
    anchor:             anchor,
    and:                and,
    andNot:             andNot,
    attribute:          attribute,
    bind:               bind,
    bindDefault:        bindDefault,
    bindEmptyAs:        bindEmptyAs,
    boost:              boost,
    box:                box,
    bucket:             bucket,
    calculate:          calculate,
    calculateFunction:  calculateFunction,
    circle:             circle,
    collection:         collection,
    copyFrom:           copyFromQueryBuilder,
    lsqtQuery:          lsqtQuery,
    datatype:           datatype,
    directory:          directory,
    document:           document,
    documentFragment:   documentFragment,
    element:            element,
    extract:            extract,
    facet:              facet,
    facetOptions:       facetOptions,
    field:              field,
    fragmentScope:      fragmentScope,
    geoAttributePair:   geoAttributePair,
    geoElement:         geoElement,
    geoElementPair:     geoElementPair,
    geoOptions:         geoOptions,
    geoPath:            geoPath,
    geoProperty:        geoProperty,
    geoPropertyPair:    geoPropertyPair,
    heatmap:            heatmap,
    latlon:             latlon,
    locksFragment:      locksFragment,
    near:               near,
    not:                not,
    notIn:              notIn,
    pathIndex:          pathIndex,
    point:              point,
    polygon:            polygon,
    properties:         properties,
    property:           property,
    byExample:          byExample,
    qname:              qname,
    or:                 or,
    orderBy:            orderBy,
    ordered:            ordered,
    parseBindings:      parseBindings,
    parsedFrom:         parsedFrom,
    parseFunction:      parseFunction,
    period:             period,
    periodCompare:      periodCompare,
    periodRange:        periodRange,
    range:              range,
    rangeOptions:       rangeOptions,
    score:              score,
    scope:              scope,
    slice:              slice,
    snippet:            snippet,
    sort:               sort,
    southWestNorthEast: southWestNorthEast,
    temporalOptions:    temporalOptions,
    term:               term,
    termOptions:        termOptions,
    transform:          transform,
    value:              value,
    weight:             weight,
    where:              where,
    withOptions:        withOptions,
    word:               word
};
