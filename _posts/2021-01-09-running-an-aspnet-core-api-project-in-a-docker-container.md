---
layout: post
title: Running an ASP.NET Core API Project in a Docker Container
tags: docker
categories: containerization
featured-image: /public/2021-01-09/2021-01-09-docker-featured-image.png
featured-image-alt: docker abstract feature
description: Containerize your ASP.NET Core API project using Docker.
---

Web applications nowadays are commonly making use of the cloud native computing architectural style to deliver highly scalable services. One element in cloud native computing is the use of containers.

Containers allow applications to be deployed in a packaged and isolated manner where all of the dependencies for the application reside only within the container. Currently, [Docker](https://www.docker.com/) is the most popular containerization technology which offers standardized, lightweight and secure containers.

## The HomeBrew Project
We are going to work with a simple project to demonstrate the use of Docker for containerization.

**[HomeBrew](https://github.com/jlawcordova/homebrewed)** is a mini ReST 
API for an imaginary beer website made with ASP.NET Core. Its repository is available on Github. It has two main directories: `HomeBrewed`, the ASP.NET Core API project, and `HomeBrewed.Tests`, the XUnit project which contains the `HomeBrewed` test cases.

We'll just focus on the `HomeBrewed` directory for this demonstration. We are going to run the project in a Docker container and we will make use of the VSCode Docker extension to easily set this up.

## Using VS Code Extension

Open the `HomeBrewed/HomeBrewed` directory in [Visual Studio Code](https://code.visualstudio.com/). If you do not have it yet, install the [Docker extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker) on VS Code.

Open the command pallete (`F1`) and select the `Docker: Add Docker Files to Workspace`.

![VS Code Add Dockerfile](/public/2021-01-09/2021-01-09-vscode-add-docker-file.png "VS Code Add Dockerfile")

Select `.NET: ASP.NET Core` for the application platform, `Linux` for the operating system, and `5000` for the port where our app will listen to.


A Dockerfile will be generated in the project directory with the following contents:

``` docker
FROM mcr.microsoft.com/dotnet/aspnet:3.1 AS base
WORKDIR /app
EXPOSE 5000

FROM mcr.microsoft.com/dotnet/sdk:3.1 AS build
WORKDIR /src
COPY ["HomeBrewed.csproj", "./"]
RUN dotnet restore "HomeBrewed.csproj"
COPY . .
WORKDIR "/src/."
RUN dotnet build "HomeBrewed.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "HomeBrewed.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "HomeBrewed.dll"]
```

## Multi-Stage Builds
The Dockerfile above makes use of [multi-stage builds](https://docs.docker.com/develop/develop-images/multistage-build). Instead of using just one base image, we use different images to support the build pipeline our codebase has to go through.

This specific Dockerfile goes through **(1) setting up the base image**, **(2) building the project**, **(3) publishing the project** and **(4) running the published project in the final container**.

### Setting up the Base Image
``` dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:3.1 AS base
WORKDIR /app
EXPOSE 5000
```
The first 3 lines (the first stage) in the Dockerfile basically prepares the base image we will be using later on for the container where our project will run. It uses a lightweight image with an ASP.NET 3.1 runtime.

``` docker
FROM mcr.microsoft.com/dotnet/aspnet:3.1 AS base
```
It also exposes port 5000 to our host machine where the HomeBrew API will be served.

``` docker
EXPOSE 5000
```

### Building the Project
``` docker
FROM mcr.microsoft.com/dotnet/sdk:3.1 AS build
WORKDIR /src
COPY ["HomeBrewed.csproj", "./"]
RUN dotnet restore "HomeBrewed.csproj"
COPY . .
WORKDIR "/src/."
RUN dotnet build "HomeBrewed.csproj" -c Release -o /app/build
```

The second stage is where the HomeBrewed project is built. Here we use an image with the Dotnet 3.1 SDK. This image is quite bloated, hence why we use multi-stage to keep this phase separate from the image where we'll actually run the project.
``` docker
FROM mcr.microsoft.com/dotnet/sdk:3.1 AS build
```

We use `/src` as our working directory and copy the `HomeBrewed.csproj` in there. This is the only thing copied because this is the minimal requirement to be able to restore the project. This helps optimize our docker image since Docker will make use of its cache if no changes are made to the `HomeBrewed.csproj` file.
``` docker
WORKDIR /src
COPY ["HomeBrewed.csproj", "./"]
RUN dotnet restore "HomeBrewed.csproj"
```

After restoring the project, we copy the entire project source code into the `/src/.` working directory and create the HomeBrew project's release build.
``` docker
COPY . .
WORKDIR "/src/."
RUN dotnet build "HomeBrewed.csproj" -c Release -o /
```

### Publishing the Project
``` docker
FROM build AS publish
RUN dotnet publish "HomeBrewed.csproj" -c Release -o /app/publish
```
The third stage published the project. This reuses the image from the second stage which already contains the ASP.NET SDK and project files needed for publishing.

### Running the Project
``` docker
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "HomeBrewed.dll"]
```
Lastly, we use the image from the first stage as the image that will run our project.
```
FROM base AS final
WORKDIR /app
```
We then copy the published files generated from the previous stage.
```
COPY --from=publish /app/publish .
```
Finally, we execute the `dotnet` command to get the project running.
```
ENTRYPOINT ["dotnet", "HomeBrewed.dll"]
```

## Host Configuration

We do have to add one more thing to the Dockerfile before running it. We add an environment variable in the first stage as part of [host configuration](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/host/generic-host?view=aspnetcore-3.1#host-configuration-1).

``` docker
FROM mcr.microsoft.com/dotnet/aspnet:3.1 AS base
WORKDIR /app
EXPOSE 5000
ENV ASPNETCORE_URLS=http://*:5000
```

Our ASP.NET Core API project needs this environment variable to determine the URL where our project will be served. In this case, it is the localhost in the container on port 5000.


## Build and Run the Container

The Dockerfile is now setup. It's time to get it built and running

Build the image with the following command:

``` sh
docker build -t homebrew .
```

`-t` sets the tag of the image to `homebrew`. The `.` means we're using the `Dockerfile` file in this directory.

The `homebrew` image can now be run with:

``` sh
docker run -dp 5000:5000 homebrew
```

`-dp` is shorthand for `-d` and `-p`. `-d` runs the container as detached or in the background. `p` sets the port that would be exposed in our host machine which is `5000`.

Executing that last command should have our project up and running. Open up a browser and go to `localhost:5000` and see the HomeBrew project in action.

## Conclusion
Docker is great tool for containerization and offers an easy way for setting up an isolated environment. Applications are more distributable and are quicker to set up with the use of docker containers.

Learn more about docker at [https://docs.docker.com/get-started](https://docs.docker.com/get-started).