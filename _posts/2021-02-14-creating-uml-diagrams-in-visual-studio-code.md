---
layout: post
title: Creating UML Diagrams in Visual Studio Code
tags: UML diagrams
categories: documentation
featured-image: /public/2021-02-14/2021-02-14-uml-featured-image.png
featured-image-alt: uml abstract feature
description: Make your UML diagrams easier to manage by using a textual format. All with the help of a useful Visual Studio Code extension.
---

In the world of agile development, software engineers often value [working software over comprehensive documentation](https://agilemanifesto.org/). That is, instead of 200 pages of mind-numbing documentation, the code repository itself is the best source of truth and comprehensive information. With that said, there are instances where documentation provides enough value for it to be worthwhile e.g. when used for effective communication, when it provides business value to clients.

One tool often used in software documentation is UML or **Unified Modeling Language**. UML is a standard way of visualizing software systems, offering a variety of diagram components which can be used to describe a multitude of software behavior or structure. UML diagrams allow developers to communicate system designs in a visual manner such as the one shown below for a Point of Sale Terminal system:

![Use Case Diagram](/public/2021-02-14/2021-02-14-use-case-diagram.png "Use Case Diagram")

## Making UML Diagrams in Visual Studio Code

You can make UML diagrams in a textual manner. This makes the diagram easier manage and storable in version control. This can be done in Visual Studio Code with the help of a pretty cool extension - **[Markdown Preview Enhanced](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced)** and a powerful UML library **[PlantUML](https://plantuml.com/)**.

### Installing Requirements

First, install the extension in Visual Studio Code - open the **Extensions** tab, and search and download **Markdown Preview Enhanced** by [Yiyi Wang
](https://marketplace.visualstudio.com/publishers/shd101wyy) in the marketplace.

Second, to be able to work with PlantUML, download and install [Java](https://www.java.com/en/download/) and [Graphviz](https://plantuml.com/graphviz-dot#189beacd87f5ff7d) by clicking on the respective links.

Once these are setup, you should be able to start writing UML diagram in Visual Studio Code.

### Writing with PlantUML

Different kinds of UML diagrams can be written with PlantUML. For now, we are just going to make a **Use Case Diagram** to demonstrate this capability. We'll try to create the Point of Sale Terminal use case diagram shown earlier.

1. Start with the following lines to tell the markdown renderer that we are trying to create a PlantUML diagram.

        ``` puml

        ```

2. Define the components that will be part of the diagram - the Cashier actor and the POS component. 

        ``` puml

        actor Cashier

        package POS as "Point of Sale Terminal" {
        }

        ```

    ![Use Case Diagram Components](/public/2021-02-14/2021-02-14-use-case-components.png "Use Case Diagram Components")

3. POS also has some use cases which we shall define inside the POS package.

        ``` puml

        actor Cashier

        package POS as "Point of Sale Terminal" {
            usecase Login
            usecase CheckProduct as "Check Product Info"
            usecase PerformCheckout as "Perform Checkout"
        }

        ```

    ![Use Case Diagram Usecases](/public/2021-02-14/2021-02-14-use-case-usecases.png "Use Case Diagram Usecases")

4. Next, we connect the Cashier to each of the POS use case.

        ``` puml

        actor Cashier

        package POS as "Point of Sale Terminal" {
            usecase Login
            usecase CheckProduct as "Check Product Info"
            usecase PerformCheckout as "Perform Checkout"
        }

        Cashier --> Login
        Cashier --> CheckProduct
        Cashier --> PerformCheckout

        ```

    ![Use Case Diagram Connections](/public/2021-02-14/2021-02-14-use-case-connection.png "Use Case Diagram Connections")

5. Lastly, we arrange the components from left to right to make it a bit more visually appealing.

        ``` puml

        left to right direction

        actor Cashier

        package POS as "Point of Sale Terminal" {
            usecase Login
            usecase CheckProduct as "Check Product Info"
            usecase PerformCheckout as "Perform Checkout"
        }

        Cashier --> Login
        Cashier --> CheckProduct
        Cashier --> PerformCheckout

        ```

    ![Use Case Diagram](/public/2021-02-14/2021-02-14-use-case-diagram.png "Use Case Diagram")

The Use Case Diagram is only one of the many UML diagrams that can be used to describe a software system. [Activity Diagrams](https://plantuml.com/activity-diagram-beta), [Sequence Diagrams](https://plantuml.com/sequence-diagram), [Class Diagrams](https://plantuml.com/class-diagram) and a lot more can be made and are fully documented in PlantUML's [website](https://plantuml.com/).

## Conclusion

UML diagrams can be useful in scenarios where it can be an effective communication tool. It can be used in the system design phase, in on-going documentation, or simply when describing a software system to clients.

Do be wary of over-documentation. Not every corner of your system has to be comprehensively documented. This may only lead to additional work and maintenance which does more harm than good.

In the words of [Martin Fowler](https://martinfowler.com/articles/designDead.html#UmlAndXp):

> Remember that the code is the repository of detailed information, the diagrams act to summarize and highlight important issues.