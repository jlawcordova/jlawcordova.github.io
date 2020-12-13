---
layout: post
title: Collecting and Monitoring Application Metrics with Elasticsearch, Logstash, Kibana and Filebeat (ELK Stack)
tags: elasticsearch logstash kibana ELK
categories: monitoring
---

Application metric is an important data point when it comes to working with production software. Application metrics help us determine the health of our application (along with system metrics) and even business-level information such as popular application features and trends. A lot of tools are available for effectively collecting and monitoring application metrics. One such tool is the ELK stack.

## The Stack

ELK stack is short for Elasticsearch, Logstash and Kibana stack.

**[Logstash](https://www.elastic.co/logstash)** is responsible for extracting and transforming logs or metrics from the application. It is often used in conjuction with [Beats](https://www.elastic.co/beats/) which comes in many flavors. We specifically want to work with **[Filebeat](https://www.elastic.co/beats/filebeat)** in this case since it can be used to harvest and ship any application logs. All of these metrics are loaded into **[Elasticsearch](https://www.elastic.co/elasticsearch/)** for centralized storage and optimized data queries. **[Kibana](https://www.elastic.co/kibana)** is then served up as the user-facing interface for Elasticsearch in order to seamlessly navigate and visualize all of the metrics.

[ELK Stack Image]

## The HomeBrew Application

We are going to work with a simple project to help demonstrate and setup the ELK stack.

**The HomeBrew** is a mini ReST API which allows retrieving of available beers. It has two endpoints, `GET /beer/` and `GET /beer/{beerId}` which fetches all beers or a single beer, respectively. The HomeBrew application generates logs for the following:

- When `GET /beer/` is called.
- When `GET /beer/{beerId}/` is called.
- When `GET /beer/{beerId}/` is called but no such beer ID exists.

which all appear on the logs like so:

```
2020-12-12 17:28:13.6185|1|INFO|HomeBrewed.Controllers.BeerController|Retrieved all beers |url: https://localhost/beer|action: Get
2020-12-12 17:28:36.4174|2|INFO|HomeBrewed.Controllers.BeerController|Retrieved beer 1 |url: https://localhost/beer/1|action: GetById
2020-12-12 17:28:41.7105|3|WARN|HomeBrewed.Controllers.BeerController|Beer not retrieved |url: https://localhost/beer/1231|action: GetById
```

The next sections will describe the entire pipeline setup from collecting, down to visualizing these HomeBrew logs. For simplicity, all of the ELK stack components will be in the same Windows machine.

## Setting Up Elasticsearch and Kibana

Elasticsearch and Kibana need to be set up and running so all the metrics will have some place to be loaded to. In this demonstration, we will serve both of these locally ([cloud hosting](https://www.elastic.co/cloud/) could also be a better option). 

[Download Elasticsearch](https://www.elastic.co/downloads/elasticsearch), extract the zip file, and run `bin\elasticsearch.bat` as described in the download page. Elasticsearch should be running in `http://localhost:9200`.

[Download Kibana](https://www.elastic.co/downloads/kibana), extract the zip file, modify the `config/kibana.yml` to set the `elasticsearch.hosts` to point to the Elasticsearch instance (`http://localhost:9200`)


{% highlight yml %}
elasticsearch.hosts: ["http://localhost:9200"]
{% endhighlight %}

and run `bin\kibana.bat` as described in the download page. Kibana should be running in `http://localhost:5601`.

![Running Kibana Instance](/public/2020-12-12-kibana.png "Running Kibana Instance")

## Harvesting with Filebeat

[Download Filebeat](https://www.elastic.co/downloads/beats/filebeat) and extract the zip file. We will then set Filebeat to collect and send the HomeBrew logs to Logstash by modifying the `filebeat.yml` file.

{% highlight yml %}
filebeat.inputs:
- type: log
  paths:
    - 'C:\homebrew\log\*.log'

output.logstash:
  hosts: ["localhost:5044"]
{% endhighlight %}

This configures Filebeat to retrieve all the HomeBrew logs (in this case found in the `C:\homebrew\log` directory) and send them to Logstash.

Test this configuration by running:

{% highlight cmd %}
.\filebeat.exe -e test config
{% endhighlight %}

When that's clear, run Filebeat using:

{% highlight cmd %}
.\filebeat.exe -e -c filebeat.yml -d "publish"
{% endhighlight %}

Filebeat will attempt to connect to Logstash. Error messages will appear until we actually serve Logstash in `localhost:5044` as described in the next section.

## Parsing and Loading with Logstash

{% highlight conf %}
input {
  beats {
        port => "5044"
    }
}

filter {
  grok {
    match => { "message" => "%{TIMESTAMP_ISO8601:timestamp}\|%{NUMBER:eventid}\|%{LOGLEVEL:level}\|%{GREEDYDATA:namespace}\|%{GREEDYDATA:content}\|url: %{URI:uripath}\|action: %{WORD:method}"}
  }

  date {
    match => [ "timestamp" , "yyyy-MM-dd HH:mm:ss.SSSS" ]
    timezone => "UTC"
  }
}

output {
  elasticsearch {
    hosts => [ "localhost:9200" ]
    user => elastic
    password => password
  }
}
{% endhighlight %}

{% highlight cmd %}
.\bin\logstash.bat -f homebrew-pipeline.conf --config.test_and_exit
{% endhighlight %}

{% highlight cmd %}
.\bin\logstash.bat -f homebrew-pipeline.conf --config.reload.automatic
{% endhighlight %}

{% highlight conf %}
{
  "log"=> {
    "file"=> {
      "path"=> "C:\\homebrew\\log\\homebrew-2020-12-12.log"
    },
    "offset"=> 0
  },
  "agent"=> {
    "version"=> "7.10.1",
    "type"=> "filebeat"
  },
  "@version"=> "1",
  "uripath"=> "https://localhost/beer",
  "method"=> "Get",
  "timestamp"=> "2020-12-12 17:28:13.6185",
  "ecs"=> {
    "version"=> "1.6.0"
  },
  "@timestamp"=> 2020-12-12T17:28:13.618Z,
  "namespace"=> "HomeBrewed.Controllers.BeerController",
  "input"=> {
    "type"=> "log"
  },
  "level"=> "INFO",
  "content"=> "Retrieved all beers ",
  "message"=> "2020-12-12 17:28:13.6185|1|INFO|HomeBrewed.Controllers.BeerController|Retrieved all beers |url: https://localhost/beer|action: Get",
  "eventid"=> "1"
}
{% endhighlight %}

## Visualizing in Kibana