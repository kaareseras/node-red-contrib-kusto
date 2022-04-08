const {IngestClient, ManagedStreamingIngestClient } = require("azure-kusto-ingest");
const IngestionProps = require("azure-kusto-ingest").IngestionProperties;
const KustoConnectionStringBuilder = require("azure-kusto-data").KustoConnectionStringBuilder;
const { DataFormat, JsonColumnMapping } = require("azure-kusto-ingest");

var ingestClient = null;

class Msg {
    constructor(topic = "", payload = "") {
      this.timestamp = new Date().toISOString();
      this.topic = topic;
      this.payload = payload;
      }
  }

module.exports = function(RED) {
    function KustoConfigNode(node) {
        RED.nodes.createNode(this, node);
        this.name = node.name;
        //this.cluster_ingest_uri = node.cluster_ingest_uri;
        this.database_name = node.database_name;
        this.table_name = node.table_name;
        //this.application_id = node.application_id;
        //this.application_secrect = node.application_secrect;
        //this.directory_id = node.directory_id;
        this.buffer_time = node.buffer_time;
        this.streaming = node.streaming;
    }

    RED.nodes.registerType("kusto-config", KustoConfigNode, {
        credentials: {
            cluster_ingest_uri: {type: "text"},
            application_id: {type: "text"},
            application_secrect: {type: "text"},
            directory_id: {type: "text"}
        }
    });
    
    function KustoIngestNode(config) {
        RED.nodes.createNode(this,config);
        const  node = this;
        node.config = config;

        // Local variables
        var ticker = null;
        var ticks = -1;
        var timeout = 5; 
        var msgObjList = [];

        this.kustoConfig = RED.nodes.getNode(config.kustoConfig);
             
        if (this.kustoConfig) {
            
            console.log("**************************")
            console.log(node.kustoConfig.credentials.cluster_ingest_uri)
            console.log("**************************")


            
            node.status({fill: "blue", shape: "ring", text: "Waiting"});

            timeout = parseInt(node.kustoConfig.buffer_time);
            
            // const kcsb = KustoConnectionStringBuilder.withAadApplicationKeyAuthentication(
            //     node.kustoConfig.cluster_ingest_uri, 
            //     node.kustoConfig.application_id, 
            //     node.kustoConfig.application_secrect, 
            //     node.kustoConfig.directory_id
            // );

            // const ingestionProps = new IngestionProps({
            //     database: node.kustoConfig.database_name,
            //     table: node.kustoConfig.table_name,
            //     format: DataFormat.MULTIJSON,
            //     ingestionMappingReference: 'nodered_json_mapping'
            // });

            const kcsb = KustoConnectionStringBuilder.withAadApplicationKeyAuthentication(
                node.kustoConfig.credentials.cluster_ingest_uri, 
                node.kustoConfig.credentials.application_id, 
                node.kustoConfig.credentials.application_secrect, 
                node.kustoConfig.credentials.directory_id
            );

            const ingestionProps = new IngestionProps({
                database: node.kustoConfig.database_name,
                table: node.kustoConfig.table_name,
                format: DataFormat.MULTIJSON,
                ingestionMappingReference: 'nodered_json_mapping'
            });
            
            if(node.kustoConfig.streaming == false){
                ingestClient = new IngestClient(kcsb, ingestionProps);  
            }
            else{
                ingestClient = ManagedStreamingIngestClient.fromDmConnectionString(kcsb, ingestionProps); 
            }

            startTimer();

            node.on('input', function(msg) {
                msgObj = new Msg(msg.topic, msg.payload);
                msgObjList.push(msgObj);
            });


        } else {
            node.warn('Kusto API: No kusto config defined');
            node.status({fill: "red", shape: "ring", text: "Invalid config"});
        }

        function startTimer() {
            ticks = timeout;

            node.status({
                fill: "green", shape: "dot", text: "Buffering: " + ticks
            });


            if (!ticker) {
                ticker = setInterval(function() { node.emit("TIX"); }, 1000);
            }
        }

        function endTicker() {
            if (ticker) {
                clearInterval(ticker);
                ticker = null;
            }

            ticks = -1;
        }

        async function sendMessages(){

                jsonString = "";
                
                for(var i = 0; i < msgObjList.length; i++) {
                    jsonString += JSON.stringify(msgObjList[i]);
                }

                var Readable = require('stream').Readable;
                var json_stream = new Readable();
                
                json_stream.push(jsonString);
                json_stream.push(null);
            
                try{
                    result = await ingestClient.ingestFromStream(json_stream, null);
                }
                catch(err){
                    console.log(err);
                }
        }

        node.on("TIX", function() {
            if (ticks > 1) {
                ticks--;
     
                node.status({
                    fill: "green", shape: "dot", text: "Buffering: " + ticks
                });

            } else if (ticks == 1){
                ticks = 0;
                endTicker();
                if( msgObjList.length > 0){
                    sendMessages();
                }
                var sendMessegesCount = { "payload": msgObjList.length };
                node.send(sendMessegesCount);
                msgObjList = []
                startTimer()
            } else {
                // Do nothing
            }
        });

        node.on("close", function() {
            if (ticker) {
                clearInterval(ticker);
            }
        });  
    
    }
    RED.nodes.registerType("kusto-ingest",KustoIngestNode);
}