var https = require('https');
var fs = require('fs');
var mysql = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'thesis',
});

var client_id = ''; // need to config
var client_secret = ''; // need to config

var tableName = 'java_raw_json';
var timeout = 10000;
var accessToken = '';
var feedPath = '/2204806663/feed?access_token=';
var accessTokenPath = '/oauth/access_token?grant_type=client_credentials&client_id='+client_id+'&client_secret='+client_secret;

function requestFacebookGraph(path, onComplete){
  
  var options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: path,
    method: 'GET'
  };

  console.log('REQUEST: '+options.hostname+options.path+'\n\n');

  var req = https.request(options, function(res) {

    res.setEncoding('utf8');

    var data = '';
    
    res.on('data', function (chunk) { data += chunk; });

    res.on('end', function(){ onComplete(data); });

  });

  req.end();

  req.on('error', function(e) {

   console.log('problem with request: ' + e.message+'\n\n');

   // on timeout error retry feed
   if(e.message == 'ETIMEDOUT'){

    console.log('RETRY FEED');
    requestFeed();
  }

});

}

function isJSON(str){
  return str.indexOf('{') === 0;
}

function saveDataThenFeed(data){

  // is error try request token
  if(JSON.parse(data).error){

    if(JSON.parse(data).error.code == 104){

      console.log('ACCESS TOKEN ERROR\n');
      console.log(data+'\n\n');

      // request new token
      console.log('REQUESTING NEW ACCESS TOKEN\n\n');
      // feed on complete
      requestNewAccessToken(function(){

          // feed next
          console.log('FEED AGAIN'+'\n\n');
          setTimeout( requestFeed, timeout ); 
        });
    } else {

      console.log('UNKNOW ERROR\n');
      console.log(data+'\n\n');
    }

  } else {

    // save to database
    connection.query('INSERT INTO '+tableName+' SET ?', {json: data}, function(err, d){
      
      console.log('INSERT #ID: '+d.insertId+'\n\n');

      var nextFeedPath = JSON.parse(data).paging.next.replace('https://graph.facebook.com','');

      // end feedPath when feedPath is the same
      if(nextFeedPath === feedPath){

        console.log('END OF FEED');
        return;

      } else {

        feedPath = nextFeedPath;
      }

      // feed next
      console.log('FEED NEXT' + '\n\n');
      setTimeout( requestFeed, timeout ); 
    });
    
  }

}

function requestFeed(){
  requestFacebookGraph(feedPath+accessToken, saveDataThenFeed);
}

function requestNewAccessToken(onComplete){

  requestFacebookGraph(accessTokenPath, function(data){

    accessToken = data.replace('access_token=', '');

    console.log('SET ACCESS TOKEN: '+accessToken+'\n\n');

    onComplete();
  });
}

// request facebook graph
requestFacebookGraph(feedPath+accessToken, saveDataThenFeed);



