//-------------------------------------------------------------
// CONFIG
//-------------------------------------------------------------

var tablePrefix = 'java';

//-------------------------------------------------------------
// END CONFIG
//-------------------------------------------------------------

var mysql = require('mysql');
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'thesis',
});

var table = {
	comments: tablePrefix+'_comments',
	members: tablePrefix+'_members',
	messageTags: tablePrefix+'_message_tags',
	post: tablePrefix+'_post',
	post_likes: tablePrefix+'_post_likes',
	raw_json: tablePrefix+'_raw_json'
}

var memberId = [];
var postId = [];
var commentId = [];

//-------------------------------------------------------------
// INIT APPS
//-------------------------------------------------------------

// get raw data
query('SELECT * FROM '+table.raw_json+'', function(rows){

	// each feed
	for (var i = 0; i < rows.length; i++) {

		// fetch data each row
		var data = JSON.parse(rows[i].json).data;

		// each post
		eachPost(data, function(post_id, from, message, messageTags, likes, type, comments){

			// insert post to database
			insertPost({  
				id: post_id,
				member_id: from.id,
				member_name: from.name,
				message: message,
				likes_count: likes.data.length,
				type: type
			});

			// insert member
			insertMember({
				id: from.id,
				name: from.name
			});

			// each post likes
			for (var i = 0; i < likes.data.length; i++) {
				
				var likeMember = likes.data[i];

				// insert post likes
				insertLikes({
					member_id: likeMember.id,
					member_name: likeMember.name,
					post_id: post_id
				});

				// insert member
				insertMember({
					id: likeMember.id,
					name: likeMember.name
				});

			};

			// each messageTags
			for (var i = 0; i < messageTags.length; i++) {
				
				var tag = messageTags[i];

				// insert messageTag
				insertMessageTags({
					post_id: post_id,
					tag_id: tag.id,
					tag_name: tag.name,
					type: tag.type ? tag.type : 'unknow',
					offset: tag.offset,
					length: tag.length		
				});

				// insert member when tag are member
				if(type == 'user'){

					// insert member
					insertMember({
						id: tag.id,
						name: tag.name
					});
				}

			};

			// each comments
			eachComments(comments, function(comment_id, from, message, messageTags, likes){

				// insert comments
				insertComment({
					id: comment_id,
					member_id: from.id,
					member_name: from.name,
					message: message,
					likes_count: likes,
					post_id: post_id
				});

				// insert member
				insertMember({
					id: from.id,
					name: from.name
				});

				// each messageTags
				for (var i = 0; i < messageTags.length; i++) {

					var tag = messageTags[i];

					// insert messageTag
					insertMessageTags({
						comment_id: comment_id,
						tag_id: tag.id,
						tag_name: tag.name,
						type: tag.type ? tag.type : 'unknow',
						offset: tag.offset,
						length: tag.length		
					});


					// insert member when tag are member
					if(type == 'user'){

						// insert member
						insertMember({
							id: tag.id,
							name: tag.name
						});
					}
				};

			});// end eachComments

		}); // end eachPost

	}; // end feed
});

//-------------------------------------------------------------
// FUNCTIONS
//-------------------------------------------------------------

function insertMember(data, callback){

	// check is exist ?
	if(memberId.indexOf(data.id) === -1){

		// assign
		memberId.push(data.id);

		// insert when not exist
		query('INSERT INTO '+table.members+' SET ?', data, callback);
	}
}

function insertLikes(data, callback){

	query('INSERT INTO '+table.post_likes+' SET ?', data, callback);
}

function insertMessageTags(data, callback){
	
	query('INSERT INTO '+table.messageTags+' SET ?', data, callback);
}

function insertPost(data, callback){

	// check is exist ?
	if(postId.indexOf(data.id) === -1){

		// assign
		postId.push(data.id);

		// insert when not exist
		query('INSERT INTO '+table.post+' SET ?', data, callback);
	}
}

function insertComment(data, callback){

	// check is exist ?
	if(commentId.indexOf(data.id) === -1){

		// assign
		commentId.push(data.id);

		// insert when not exist
		query('INSERT INTO '+table.comments+' SET ?', data, callback);
	}
}

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

			callback(rows);
		}
		
	});

}

function eachPost(data, callback){

	// each post
	for(var i=0; i<data.length; i++){

		var post = data[i];

		callback(

			post.id, // STRING
			post.from, // { name: STRING, id: STRING }
			post.message ? post.message : '' , // STRING
			post.message_tags ? post.message_tags : [], // [{ id: STRING, name: STRING, type: STRING, offset: INT, length: INT }, ... ]
			post.likes ? post.likes : {data:[], count:0}, // { data:[{ name: STRING, id: STRING }, ... ], count: INT }
			post.type, // STRING
			!isEmpty(post.comments) ? post.comments : {data:[], count:0} // { data: [ { id:STRING, from: { name:STRING, id: STRING }, message: STRING }, ... ], count: INT }
			);
	}

}

function eachComments(comments, callback){

	// fixed when some data is { count: 0 }
	if(comments.data && comments.data.length > 0){

		// each comments
		for(var i=0; i<comments.data.length; i++){

			var comment = comments.data[i];

			callback(

				comment.id, // STRING
				comment.from, // { name: STRING, id: STRING }
				comment.message ? comment.message : '' , // STRING
				comment.message_tags ? comment.message_tags : [], // [{ id: STRING, name: STRING, type: STRING, offset: INT, length: INT }, ... ]
				comment.likes ? comment.likes : 0 // INT

				);
		}
	}

}

function isEmpty(obj) {

	for(var prop in obj) {
		
		if(obj.hasOwnProperty(prop))
			return false;
	}

	return true;
}
