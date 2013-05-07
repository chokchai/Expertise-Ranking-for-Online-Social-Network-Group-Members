var Step = require('step');
var mysql = require('mysql');
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'thesis',
});

//-------------------------------------------------------------
// INIT APPS
//-------------------------------------------------------------

// index
var posts = [];

// select post
query('SELECT * FROM java_post ORDER BY id DESC', selectComment);

function selectComment(rows){

	for(var i=0; i<rows.length; i++){

		// post
		var row = rows[i];

		posts[row.id] = row;

		query("SELECT * FROM java_comments WHERE post_id = '"+row.id+"'", insertToDB);
	}
}

function insertToDB(rows){

	for(var i=0; i<rows.length; i++){

		// comments
		var row = rows[i];

		query(
			'INSERT INTO java_post_members SET ?', 
			{ post_id: row.post_id, member_post_id: posts[row.post_id].member_id, member_comment_id: row.member_id, likes_count: row.likes_count, message: row.message }
		);
	}
}

//-------------------------------------------------------------
// FUNCTIONS
//-------------------------------------------------------------

function query(sql, data, callback){

	// ovrloading
	if(typeof data === 'function'){

		callback = data;
		data = {};
	}

	var con = connection.query(sql, data, function(err, rows){

		if(err){

			console.log(sql);
			console.log(data);
			throw err;
		} 

		console.log('QUERY: '+sql);
		console.log(data);
		console.log('\n');

		if(typeof callback === 'function'){

			callback(rows, err);
		}
		
	});

}