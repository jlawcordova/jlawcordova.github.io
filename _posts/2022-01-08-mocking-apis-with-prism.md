---
layout: post
title: Mocking APIs with Prism
tags: mock api prism nodejs
categories: api
featured-image: /public/2022-01-08/2022-01-08-prism-featured-image.png
featured-image-alt: prism abstract feature
description: Quickly mock APIs using OpenAPI and Prism.
---

Creating APIs can have two different approaches of development - [code-first approach and design-first approach](https://swagger.io/blog/api-design/design-first-or-code-first-api-development).

In the code-first approach, developers immediate get started on working on the API code once requirements are defined. As a result, the API build and its specification become available after coding the API. If issues are found by API clients or users, the code changes are made by the API developers and another build and documents would be generation. This can become cumbersome if a lot of revisions occur in this approach and could lead to lag times for the clients while they wait for a build to be created.

In the design-first approach, the API specification (usually using [OpenAPI specification](https://swagger.io/specification/)) is created first before implementing the API. The API specification goes through a review and is verified first before proceeding with actual API development. This way, issues can be detected early in the development phase.

With the design-first approach, some tooling will help so that API clients can immediately try the API out even with only just the specification implemented. This is where Prism comes in.

## What is Prism?

[Prism](https://meta.stoplight.io/docs/prism/ZG9jOjYx-overview) is a tool used to mock APIs provided that it has an OpenAPI specification. With Prism, a fake or mock API server can be created to which API clients can integrate with before the actual API server is implemented. This allows for parallel development between the API and frontend developers. This approach also allows developers to find issues and get feedback very early on in the development.

## Prism in Action
Suppose you're taking a design-first approach to create an API for a food delivery app. You start with making the OpenAPI specification (foodkoala.yml) for that API which appears as follows:

{% highlight yml %}
openapi: '3.0.2'
info:
  title: foodkoala API
  version: '1.0'
paths:
  /food/{restaurantId}:
    get:
      parameters:
        - name: restaurantId
          in: path
          schema:
            type: string
          required: true
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/food"

components:
  schemas:
    food:
      type: object
      properties:
        name:
          type: string
          x-faker: commerce.productName
        price:
          type: number
          x-faker: commerce.price
        imageUrl:
          type: string
          x-fake: image.food
{% endhighlight %}

This specification basically describes the GET request to retrieve all available food in a restaurant. 

To create a mock server with this specification, first install the Prism CLI.

{% highlight sh %}
npm install -g @stoplight/prism-cli
{% endhighlight %}

Then in the directory where the specification is placed, create a mock server by running

{% highlight sh %}
prism mock foodkoala.yml
{% endhighlight %}

The command abve sh

## Other Use Cases

## Alternatives

## Conclusion