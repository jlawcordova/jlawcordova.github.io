---
layout: post
title: Using Caching to Create Performant APIs
tags: caching 101
categories: architecture
featured-image: /public/2021-04-17/2021-04-17-caching-featured-image.png
featured-image-alt: uml abstract feature
description: Create performant systems by utilizing caches into your architecture.
---

One of the most common way of making APIs performant is by using caches. Caching provides the benefit of accessing data in a faster store. At the same time, it makes[] the data _closer_ to the end user. For backend systems, the developer and customer experiences becomes better with the faster response times that caching gives.

## Caching for APIs using In-Memory Datastores
The most common way to implement caching is by using the RAM already available in the machine the system is running on. **In-memory datastores** have much higher throughput compared to data stores in the disk. This can drastically improve system performance. Instead of performing expensive queries directly on a database, systems can instead use an in-memory store to access the same data. For bigger, more complex systems, it would be beneficial to use a [managed in-memory store](https://aws.amazon.com/elasticache/) instead.

Of course, it must be ensured that the data acquired from the in-memory store should be as valid as the data that would have been retrieved from the database. Some strategies can help in keeping this true.

### Lazy Loading
In the **lazy loading** strategy, every time a request on the API is made, the application first checks the in-memory datastore if the requested data is already cached. If it does, the cached data is what is immediately returned to the requesting client. This is what is known as a **cache hit** and response times in this scenario is quite fast since no query on the disk database is made.

![Lazy Loading Cache Hit](/public/2021-04-17/2021-04-17-lazy-loading-cache-hit.png "Lazy Loading Cache Hit")

A downside to this strategy is when the data does not yet exist on the cache, known as a **cache miss**. In this case, the application will have to query on the disk database and will then have to save the results in the cache – resulting in 3 expensive roundtrips.

![Lazy Loading Cache Miss](/public/2021-04-17/2021-04-17-lazy-loading-cache-miss.png "Lazy Loading Cache Miss")

### Write-through
Another strategy is called the **write-through**, where every time data is added to the disk database, the same data is immediately written into the cache. This ensures that the cache data is always updated or never _stale_, resulting in lesser cache misses and in turn faster read performance.

![Write Through](/public/2021-04-17/2021-04-17-write-through.png "Write Through")


The downside to this strategy is writing data becomes more expensive because of the 2 writing roundtrips. Another downside is data in the cache may not be read quite as often as other data, or may not be even read at all, resulting in wasted memory. Lastly, it should be considered that during initialization of the system, the cache may not yet have the same data as with the disk database. Thus, it might be good to have the write-though strategy work in conjunction with the lazy loading strategy. 


## Caching in the Web
For APIs that use the HTTP protocol such as an **HTTP ReST APIs**, there are existing web infrastructures that can aid in the implementation of caching. Standard browsers and HTTP clients adhere to **cache headers** and can be utilized to pass some caching mechanisms at the client/local level.

### Cache Headers
APIs can attach HTTP headers in their response to describe how clients can treat the caching of data or resources returned by the API. The **[Expires]( https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Expires)** header provides a specific date and time when the cache becomes stale. Until then, the client can reuse the response as cache as it is still considered valid. The **[Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)** header provides a range of standard directives to describe more specific caching controls. A common directive is `max-age` which specifies the number of seconds the cache can be considered valid or TTL (_time to live_).

### Conditional GET
API responses can also have **validator** attached in their HTTP headers, such as [ETags](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag) and [Last-Modified]( https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Last-Modified). 
These validators are used by the client in performing **conditional GET** requests. Server-side, the validators are checked from the request, and if determined to be still fresh, the API will no longer have to respond with the requested data but rather with just a **304 Not Modified** response. The 304 Not Modified response indicates to the client that the data they have cached locally can still be used, reducing bandwidth and computing resource usage.

![Conditional GET](/public/2021-04-17/2021-04-17-conditional-GET.png "Conditional GET")

## Conclusion
Caching provides multiple benefits for an API system – reduced bandwidth, reduced server load, higher throughput, and lower latency. Caching does add a bit more complexity in your system. As the saying goes,

> There are only two hard things in Computer Science: cache invalidation and naming things.

But when your system starts to scale, caching is a pretty good technical investment worth considering.
