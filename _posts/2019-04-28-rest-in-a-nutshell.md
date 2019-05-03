---
layout: post
title: REST in a Nutshell
---

Years ago, the world wide web was simply a publishing platform where we were able to read and share documents through browsers. The web we now know has grown into something more than that. We can now search for information, book flights, make payments, and even automate our homes - basically any process we can think of. In other words, the web has grown into the largest application platform we've ever known.

_**How was this possible?**_

Computer scientists were curious and studied the web's architecture which led to its success. In 2000, a man named Roy Fielding did just that as part of his doctorate in the University of California. Fielding described that the web operates on a set of rules or framework known as the **Representational State Transfer**, or **REST** for short.

_**What is REST?**_
_Let's go through each word to understand._

## State (_or Resource State_)

People, money, food - all of these are objects that exist in the real world. Technically, every single object in the real world can be placed on the web. _Well, not exatly the object itself_, but rather the information on the _current state of that object_. This is known as the *resource state* and this can be  placed on the web by providing a unique identification known as **Universal Resource Identifier** or a **URI**

> If I wanted to, I could provide the current state of my wallet on the web by placing its information as a resource.  I could then give it a URI to identify and access it, such as https://jlawcordova.github.io/wallet - _go ahead an click it! It will actually lead you to my (possibly inaccurate) wallet resource._

## Representational
The second word we'll dissect is **representational**.

What this word means it that resources should be retrievable using its **representation**. A representation could be in the form of a picture (`PNG`, `JPEG`), a video (`MP4`), a markup (`HTML`, `XML`), or any other format.

> I could make my wallet available on the web by using `XML` - a commonly used standard markup format.

## Transfer
Resources are distributed on an extremely large scale across the web and it's done using **Hypertext Transfer Protocol** or **HTTP**. With HTTP, resources can be readily created (`POST`), retrieved (`GET`), replaced (`PUT`), modified (`PATCH`), or removed (`DELETE`) from anywhere that's connected on the web.

Aside from that, additional information could be included on a resource. This information could describe how the resource can be moved from one state to another in order to for someone interacting with a resource to achieve a desired goal. This concept known as **Hypermedia As The Engine Of Application State** or **HATEOAS**.

A concrete example would be an e-commerce page for checking out payment (_the resource_). It can contain a button that when clicked (_the hypermedia_), changes the status of the payment to be `Paid` (_state transition_).

> Going back to my wallet resource, the representation I `GET` could include links to other actions that I could do with with my wallet, such as increasing or decreasing its contents.

It can be summed up that the web is basically composed of trillions of resources that can be retrieved and modified. Designing applications with REST in mind helps keep things on the web distributable at such a huge scale. 

_This article is a very simplified explanation of REST (it is just a nutshell afterall). If you're interested in learning more in detail, you can check out [Roy Fielding's dissertation](https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm)._
