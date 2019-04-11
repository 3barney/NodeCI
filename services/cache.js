const mongoose = require('mongoose')
const redis = require('redis')
const util = require('util')
const keys = require('../config/keys')

const exec = mongoose.Query.prototype.exec  // Store ref to mongoose query
// const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(keys.redisUrl);

// Client.get takes a callback as a param, so promisify makes it return a promise so we can use async await
client.hget = util.promisify(client.hget)


// Add cache function to Query object so its available to all
mongoose.Query.prototype.cache = function(options = {}) {
  // options default to false
  this.useCache = true; // set specific query to use cache
  this.hashKey = JSON.stringify(options.key || ''); // pass empty string if options.key is undefined
  return this; // Ensure its a chainable func call (we can use .query().cache())
}


mongoose.Query.prototype.exec =  async function() {
  if (!this.useCache) {
    return exec.apply(this, arguments)
  }

  // Not using arrow func but function keyword since it messes with the this keyword, but here we dont
  // since this is a function being assigned to prototype property, here THIS ref the Query object

  // THIS here is a reference to current query we are trying to execute
  // Create object with query and collection name
  const key =  JSON.stringify(
    Object.assign(
      {},
      this.getQuery(),
      { collection: this.mongooseCollection.name }
    )
  )

  // Check if we have a value for key in redis
  // const cacheValue = await client.get(key); now we use hget
  const cacheValue = await client.hget(this.hashKey, key)

  // If we do return that
  if (cacheValue) {
    // this.model = reference to model this query is attached to
    // We need to return Mongoose documents (Models) not JSON
    // const doc = new this.model(JSON.parse(cacheValue)) // hydraate arrays here
    // return doc;
    // return JSON.parse(cacheValue)

    const doc = JSON.parse(cacheValue);
    return Array.isArray(doc)
      ? doc.map(docItem => new this.model(docItem))  // Here values is an array, work with individual ones
      : new this.model(doc) // Its an object
  }

  // Otherwise issue query, store result in redis
  const result = await exec.apply(this, arguments)  // Return version of exec we havent touched, use apply to pass any arguments passed to exec
  // Result is a mongoose document, so we set it to JSON
  // client.set(key, JSON.stringify(result), 'EX', 10);
  client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10)
  return result
  
}


module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey))
  }
}