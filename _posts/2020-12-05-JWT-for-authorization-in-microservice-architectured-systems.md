---
layout: post
title: JWT for Authorization in Microservice-Architectured Systems
tags: microservice JWT
categories: security
---

## Authorization in Monolithic Systems

In monolithic systems, authorization is normally persisted using sessions. Once a user has completed authentication, a session is stored in the server persistent storage, and succeeding calls would simply provide the session ID for authorization.

![Monolithic Session Authorization](/public/2020-12-05-monolithic-authorization.png "Monolithic Session Authorization")

The use of sessions in monolithic systems is sufficient enough. However, when transitioning into a microservice-architectured system, we will find that it does not perform well because of how stateful it is.

In a microservice, authentication is normally placed in a different service (Identity Service) from where the resources are actually retrieved or handled (Resource Service). If sessions would be used in this scenario, the resource service would need to verify with the identity service if the session ID is actually valid. This increases the load on the identity service for every resource service that would need to verify with it - making the architecture less scalable.

![Microservice Session Authorization](/public/2020-12-05-sessions-in-microservices.png "Microservice Session Authorization")

## Stateless Authorization using JWT

For microservices, we might want to use [JSON web tokens (JWT)](https://jwt.io/introduction/) for authorization instead. A JWT is a token which normally contains a header (information on encryption algorithm) and a payload (information on the authorization and its expiry), signed with the identity service secret (HMAC) or private key (RSA). 

Since the state of authorization is already passed via JWT, the resource service would no longer need to call the identity service. Rather, the resource service would just need to validate the integrity of the JWT by making sure the signature matches the encrypted `header + payload` (using the HMAC secret or the RSA public key).

![Microservice JWT Authorization](/public/2020-12-05-microservices-JWT.png "Microservice JWT Authorization")

## Making Sure the JWT is not Maliciously Used

One caveat to using JWT is that it can be used until it has expired. If a user's JWT somehow falls into the wrong hands, resources would be exposed until the JWT expires. Thus, it would make sense that the JWT provided by the identity service must be really short-lived (~1-5 minutes). To avoid needing to reauthenticate every minute, the identity service should also provide a refresh token on authentication (which has a longer expiration date of ~2 weeks) that can be used to generate another JWT. The refresh token can be stored in a persistent storage in the identity service.

![Microservice Refresh Tokens](/public/2020-12-05-microservices-refresh-tokens.png "Microservice Refresh Tokens")

With the refresh token introduced into this flow, some additional steps would need to be taken for security. Specifically, there needs to be a way for refresh tokens to be revoked in case it gets compromised, or when a user decides to logout. In this case, revoking can be done via the identity service and removing the refresh token from storage.

Additionally, JWTs created using the revoked refresh token would need to be invalidated. For this, the identity service would need to notify the resource services about the revoking event via webhooks (or some other event mechanism). It would then be up to the resource service itself to take note of this event and handle incoming JWTs accordingly - by maintaining a cache of revoked refresh tokens and using that to reject JWTs which fall under the expiration window of the revoked refresh tokens.

![Revoking Refresh Tokens](/public/2020-12-05-revoking-refresh-tokens.png "Revoking Refresh Tokens")

## Conclusion

The use of JWT offers a stateless way of handling authorization. This allows scalability when using microservice architectures. It must be noted that security measures should be enforced in order to avoid misuse of JWT.