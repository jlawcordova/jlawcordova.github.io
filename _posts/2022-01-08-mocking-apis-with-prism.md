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

In the **code-first approach**, developers immediately get started on working on the API code once requirements are defined. As a result, the API build and its specification become available after coding the API. If issues are found by API clients or users, the code changes are made by the API developers and another build and documents would be generated. This can become cumbersome if a lot of revisions occur in this approach and could lead to lag times for the clients while they wait for a build to be created.

In the **design-first approach**, the API specification (usually using [OpenAPI specification](https://swagger.io/specification/)) is created first before implementing the API. The API specification goes through reviews and verifications first before proceeding with actual API development. This way, issues can be detected early in the development phase.

With the design-first approach, some tooling will help so that API clients can immediately try the API out even with only just the specification implemented. One such tool is **Prism**.

## What is Prism?

[Prism](https://meta.stoplight.io/docs/prism/ZG9jOjYx-overview) is a tool used to mock APIs that have an OpenAPI specification.

In line with the design-first approach, a fake or mock API server can be created using Prism to which API clients can integrate with before the actual API server is implemented. This allows for parallel development between the API and frontend developers. This approach also allows developers to find issues and get feedback very early on in the development.

## Prism in Action
Suppose you're taking a design-first approach to create an API for a food delivery app. You start by making the OpenAPI specification (`foodkoala.yml`) for that API which appears as follows:

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
        price:
          type: number
        imageUrl:
          type: string
{% endhighlight %}

This specification basically describes the GET request to retrieve all available food in a restaurant. The GET request has a path of `/food/{restaurantId}` and returns an array of food objects which look like:

{% highlight json %}
{
  "name": "Cheeseburger",
  "price": "50.00",
  "imageUrl": "/image/663553",
}
{% endhighlight %}

To test out this specification, we should serve up a mock server with this yml file. This is where Prism comes in. To start, first install the Prism CLI.

{% highlight sh %}
npm install -g @stoplight/prism-cli
{% endhighlight %}

Then in the directory where the yml specification file is placed, create a mock server by running:

{% highlight sh %}
prism mock foodkoala.yml
{% endhighlight %}

The command above should serve up the mock server at `localhost:4200` by defaut. Opening `localhost:4200/food/{restaurantId}` in the browser would return the following response:

{% highlight json %}
[{
  "name": "string",
  "price": "0",
  "imageUrl": "string",
}]
{% endhighlight %}

This in itself should already be enough to verify and integrate with the API. However, we can take this a step further by returning more life-like API responses.

## Generating Dynamic Responses

To generate more life-like responses, we use Prism's built-in faker system. Add the `x-faker` field in each of the response properties in the API specification, and provide what kind of fake data you want to respond with. For example, in the food name, we  can set the response to a fake ecommerce product name by adding the field `x-faker: commerce.productName`. Applying this to all of the response properties and we get a specification which looks like:

{% highlight yml %}
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

Rerun the Prism with a `-d` parameter.

{% highlight sh %}
prism mock -d foodkoala.yml
{% endhighlight %}

Opening `localhost:4200/food/{restaurantId}` in the browser would now return better dynamic responses which may look like:

{% highlight json %}
[{
  "name": "Cheeseburger",
  "price": "50",
  "imageUrl": "/image/663553",
}]
{% endhighlight %}

## Other Use Cases
Prism's ability to mock APIs opens it up to a range of use cases. Aside from using it for early integration purposes, Prism can also be used for automated integration testing. A real-life example is the [SendGrid C# client SDK](https://github.com/sendgrid/sendgrid-csharp). The Twilio team working on the SendGrid C# client SDK used Prism to mock the Twilio API. This way, they can perform integration testing with the mock API server instead of the actual Twilio servers. And because mock servers are cheap and readily available, they can run the integration tests with every code push for continuous integration.

## Alternatives
Some aternatives to Prism are **Postman** and **Swaggerhub**. Postman offers team collaboration on API design, mocking and development. Swaggerhub offers instant setup of mock servers in the cloud. To find out more about these alternative options, check out each of [Postman](https://www.postman.com/) and [Swaggerhubs](https://swagger.io/tools/swaggerhub/) respective websites.

## Conclusion
Design-first is a good approach to creating APIs especially in large cross-functional teams. Tools such as Prism helps in making API development in the design-first approach seamless and fast.

This article is based on the DevCon Summit lightning talk I did for the Davao chapter last December 2021. Check out the short Prism demo on my [Github Repository](https://github.com/jlawcordova/prism-demo).