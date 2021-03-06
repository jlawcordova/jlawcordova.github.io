---
layout: post
title: Creating Unit Test Coverage Reports for ASP.NET Core 3.1 Projects with Coverlet and ReportGenerator
tags: asp.net report
categories: testing
featured-image: /public/2020-11-28/2020-11-28-coverlet-featured-image.png
featured-image-alt: coverlet abstract feature
description: Using Coverlet to generate ASP.NET Core project coverage.
---

Unit testing is an essential part of software development to ensure code quality and refactorability. In Agile projects, code can change rapidly, and thus it is often necessary to keep the unit tests and its coverage in check. It would be a good idea for reports to be generated to easily monitor the status of unit tests.

## The HomeBrew Project
We are going to work with a simple project to demonstrate unit test reporting.

We have an ASP.NET Core 3.1 Web API Project called **HomeBrew**. For simplicity, it has a single `BeerController` which only contains API endpoints for retrieving currently available (in-memory-stored) beer varieties. These endpoints also have some tests already set up in `HomeBrew.Tests > Controllers > BeerController` - making sure that all beer varieties are actually retrieved and single beer retrieval actually works.

![HomeBrew Project Structure](/public/2020-11-28/2020-11-28-homebrew-project-structure.png "HomeBrew Project Structure")

Our goal is to be able to generate HTML reports for the HomeBrew project's available unit tests.

## Installing the Requirements

First we need [Coverlet](https://github.com/coverlet-coverage/coverlet) - a code coverage framework. Add it to the `HomeBrew.Tests` project by running:

{% highlight sh %}
dotnet add package coverlet.collector
{% endhighlight %}

For Coverlet to work, _16.5.0 and above_ of `Microsoft.NET.Test.Sdk` should be referenced. So if it's not there yet, add the following to `HomeBrew.Tests.csproj`:

{% highlight xml %}
<PackageReference Include="Microsoft.NET.Test.Sdk" Version="16.5.0" />
{% endhighlight %}

Next, we need [ReportGenerator](https://github.com/danielpalme/ReportGenerator) to convert the Coverlet reports in human-friendly format - HTML to be exact. Add it to the `HomeBrew.Tests` project by running:

{% highlight sh %}
dotnet add package ReportGenerator
{% endhighlight %}

To be enable us to generate the reports via commandline, install the [ReportGenerator global tool](https://www.nuget.org/packages/dotnet-reportgenerator-cli/) by running:

{% highlight sh %}
dotnet tool install --global dotnet-reportgenerator-globaltool --version 4.8.1
{% endhighlight %}

## Generating the Reports

Run Coverlet using the following command in the `HomeBrew.Tests` project:

{% highlight sh %}
dotnet test --collect:"XPlat Code Coverage"
{% endhighlight %}

This will run the unit tests and automatically generate a Cobertura-format XML file containing the coverage results in a `TestResults` directory.

![Coverlet Cobertura TestResults XML File](/public/2020-11-28/2020-11-28-coverlet-cobertura-file.png "Coverlet Cobertura TestResults XML File")

The XML file is then fed into ReportGenerator:

{% highlight sh %}
reportgenerator -reports:./TestResults/\*/\*.xml -targetdir:./Reports
{% endhighlight %}

This converts the Cobertura XML file into an HTML report of the unit test coverage in the specified directory `Reports`. Opening the index.html would show the coverage of our unit tests and allow line-per-line code exploration for us to see that the `BeerController` endpoints are fully covered.

![ReportGenerator HTML Report](/public/2020-11-28/2020-11-28-report-generator-code-explore.png "ReportGenerator HTML Report")

## Conclusion

Unit test reporting should be quick and simple with Coverlet and ReportGenerator. Automated reports can be done via CLI using these two tools and can be integrated into a CI/CD pipeline - perhaps for every code pull request or before every server deployment. This will help ensure that code quality is tracked and monitored in important phases of the software development cycle.