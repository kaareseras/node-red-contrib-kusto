# node-red-contrib-kusto
Custom Node-Red node to inject data in Kusto (Azure Data Explorer)

[Azure Data Explorer](https://azure.microsoft.com/en-us/services/data-explorer/)  is a high performace timeseries database, query engine and dashboarding tool.

The Node Red `Kusto (Azure Data Explorer)` integration allows you to send messages directly into events to Kusto also known as Azure Data Explorer for analytics and dashboarding.

## Create a free Azure account
* Create a  [free Azure account](https://azure.microsoft.com/). you will be asked for creditcard info, but all rescources created here are free.

## Create a Service Principal (App registration)
For Home Assistant to authenticate with Azure Data Explorer, it need a **Service Principal**
1. Create a [Service Principal](https://docs.microsoft.com/en-us/azure/data-explorer/provision-azure-ad-app) follow guide step 1-7
2. Copy values for later use:
    * Application (client) ID  <--From App registration owerwiev
    * Directory (tenant) ID    <--From App registration owerwiev
    * Secret value             <--From when the secret was created in 1.7

## Create Free Azure Dataexplorer cluster and Database
There are two ways of creating an Azure Data Explorer Cluster: **Pay as you go (PAYG)** or **Free**
to create a paid cluster follow instructions from here: [Microsoft quickstart](https://docs.microsoft.com/en-us/azure/data-explorer/create-cluster-database-portal)
However Microsoft has released a free offer and this guide describes how to set up a free Azure Data Explorer Cluster and database:

There are a few different between the **PAYG** and **Free** versions:
| Feature         | PAYG Cluster           | Free Cluster                    |
| --------------- | ---------------------- | ------------------------------- |
| Ingestion       | Streaming and Queueing | Queueing only (for now)         |
| Cluster size    | Fully scalable         | 4 vCPU, 8GB Menory, ~100GB data |

1. Navigate to [aka.ms/kustofree](https://aka.ms/kustofree).
2. Navigate to **My Cluster** .
3. And click the **Create Cluster** button.
4. Name the Cluster and database.
5. Copy the **database name** for later use
5. Check terms and condition (after reading them) and click **Create Cluster**.

Within a 30 seconds, you will have a Azure Data Explorer cluster ready

After the creation, copy the **Data ingestion URI** from the top of the page

## Create Azure Data Table
1. Navigate to [aka.ms/kustofree](https://aka.ms/kustofree).
2. Navigate to **Query**.
3. Write and execute the foloing statement, replacing \<DatabaseName> with the name from cluster creation and \<TableName> a name of your choise.

```KQL
.execute database script <|
// Add SP ingestor rights
.add database ['<DatabaseName>'] ingestors ('aadapp=b5253d02-c8f4-4a79-a0f0-818491ba2a1f;72f988bf-86f1-41af-91ab-2d7cd011db47')
// Add SP viewers rights
.add database ['<DatabaseName>'] viewers ('aadapp=b5253d02-c8f4-4a79-a0f0-818491ba2a1f;72f988bf-86f1-41af-91ab-2d7cd011db47')
//Alter Table batchin ploicy
.alter database ['<DatabaseName>'] policy ingestionbatching @'{"MaximumBatchingTimeSpan":"00:00:05", "MaximumNumberOfItems": 500, "MaximumRawDataSizeMB": 1024}'
//Drop table if exists
.drop table ['<TableName>'] ifexists
//Create table
.create table ['<TableName>'] (timestamp: datetime, topic: dynamic, payload: dynamic)
//Create JSON mapping
.create table ['<TableName>'] ingestion json mapping 'nodered_json_mapping' '[{"column":"timestamp","path":"$.timestamp"},{"column":"topic","path":"$.topic"},{"column":"payload","path":"$.payload"}]'

```

## Configuration

Insert values for Cluster Name and Table Name from previous step.
Insert Valuses from the creation of the Azure Service principal created earlier.
Insert a value for buffer time (the time NodeRed buffers messages before sending them to Kusto)


>if using a free cluster, un-check the **Use Streaming API** in the form, as this is not supported.

After completiing the flow, Node Red is sending data to Kusto - Azure Data Explorer. 

> Node Red is buffering for defualt 5 seconds before sending, and Batching Policy in Azure Data Explorer will futher batch up, so expect a litle delay before data is in Kusto.


## Using Azure Data Explorer
As the setup is complete, data is being sent to Azure Data Explorer, and you can start exploring your data.
Here are som rescources to learn to use Azure Data Explorer

* MS Learn: [https://aka.ms/learn.kql](https://aka.ms/learn.kql), [https://aka.ms/learn.adx](https://aka.ms/learn.adx)
* You tube: [Official Microsoft Azure Data Explorer YouTube channal](https://www.youtube.com/channel/UCPgPN-0DLaImaaDR_TtKR8A)
* Blog: [Official Microsoft Data Explorer blog](https://techcommunity.microsoft.com/t5/azure-data-explorer-blog/bg-p/AzureDataExplorer)