var mysql = require('mysql');
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'thesis',
	multipleStatements: true
});

var all_member = [];
var communityExpertiseNetworkIn = [];
var communityExpertiseNetworkOut = [];

//-------------------------------------------------------------
// INIT APPS
//-------------------------------------------------------------

// build adj matrix
createCommunityExpertiseNetwork(function(){

	// remove duplicate all_member
	all_member = unique(all_member);

	var pageRank = initPageRank(all_member);

	var newPageRank = calPageRank(pageRank);

	// re-calulate pagerank until is stable
	while(! isStable(pageRank, newPageRank)){

		pageRank = newPageRank;
		newPageRank = calPageRank(newPageRank);
	}

	// insert to database
	for(var id in newPageRank ){
		query('INSERT INTO java_expertise_rank_fixed3 SET ?', { member_id: id, expertise_rank: newPageRank[id] });
	}
});

//-------------------------------------------------------------
// FUNCTIONS
//-------------------------------------------------------------

function clone(obj){
    if(obj == null || typeof(obj) != 'object')
        return obj;

    var temp = obj.constructor(); // changed

    for(var key in obj)
        temp[key] = clone(obj[key]);
    return temp;
}

function fileterOne(arr){
	
	var array = [];
	for(var id in arr){

		if(arr[id] !== 1){
			array[id] = arr[id];
		}
	}

	return array;
}

function unique(arr) {
    var hash = {}, result = [];
    for ( var i = 0, l = arr.length; i < l; ++i ) {
        if ( !hash.hasOwnProperty(arr[i]) ) { //it works with objects! in FF, at least
            hash[ arr[i] ] = true;
            result.push(arr[i]);
        }
    }
    return result;
}

function isStable(arr1, arr2){

	log('COMPARE');
	// log(fileterOne(arr1));
	// log(fileterOne(arr2));

	for(var id in arr1){

		var higher = Math.max(arr1[id], arr2[id]);
		var lower = Math.min(arr1[id], arr2[id]);

		if(higher - lower > 0.0000000001){
			return false;
		}
	}

	return true;
}

function initPageRank(all_member){

	var pageRank = [];

	for (var i = 0; i < all_member.length; i++) {

		pageRank[all_member[i]] = 1;
	};

	return pageRank;
}

function calPageRank(pageRankRef){

	var newPageRank = clone(pageRankRef); // for merge array
	var d = 0.85;
	var m = Object.keys(pageRankRef).length;

	for (var i = 0; i < all_member.length; i++) {
		
		var memberId = all_member[i];

		// find income sumPageRank
		var sumPageRank = 0;
		var memberInNodeList = communityExpertiseNetworkIn[memberId];

		if(memberInNodeList !== undefined){

			for(var j = 0; j< memberInNodeList.length; j++){

				var memberIn = memberInNodeList[j];

				// link out count default is 1
				var outCount = communityExpertiseNetworkOut[memberIn] !== undefined ? 
				communityExpertiseNetworkOut[memberIn].length + 1 : 1;

				// r(j)/N(j)
				sumPageRank += pageRankRef[memberIn]/outCount;
			}

			// (1-d)/m + d*SUM(r(j)/N(j))
			newPageRank[memberId] = ((1-d)/m) + (d*sumPageRank);
		}
	};

	return newPageRank;
}

function createCommunityExpertiseNetwork(callback){

	var eachPostCounter = 0;

	query('(SELECT DISTINCT member_comment_id AS id FROM java_post_members) UNION (SELECT DISTINCT member_post_id AS id FROM java_post_members)', function(members_row){

		for(var i=0; i<members_row.length; i++){

			// post
			var row = members_row[i];

			// keep member
			if(all_member.indexOf('ID_'+row.id) === -1){
				all_member.push('ID_'+row.id);
			}

			// get who the member_comment comment to
			query('SELECT * FROM java_post_members WHERE member_comment_id = '+row.id+' AND member_post_id != '+row.id+'; SELECT * FROM java_post_members WHERE member_post_id = '+row.id+' AND member_comment_id != '+row.id, function(results){

				// result: SELECT * FROM java_post_members WHERE member_comment_id = ?	
				if(results[0].length > 0){
					addCommunityExpertiseNetworkIn(results[0]);
				}
				
				// result: SELECT * FROM java_post_members WHERE member_post_id = ?
				if(results[1].length > 0){
					addCommunityExpertiseNetworkOut(results[1]);
				}
				
			}).on('end', function(){

				if(++eachPostCounter === members_row.length){

					callback();
				}

			});
		}

	});
}

function addCommunityExpertiseNetworkIn(rows){

	// get member
	for(var i=0; i<rows.length; i++){

		// post list
		var row = rows[i];

		// add member
		if(all_member.indexOf('ID_'+row.member_post_id) === -1){
			all_member.push('ID_'+row.member_post_id);
		}

		if( ! communityExpertiseNetworkIn['ID_'+row.member_comment_id]){

			// decare member comment
			communityExpertiseNetworkIn['ID_'+row.member_comment_id] = [];
			communityExpertiseNetworkIn['ID_'+row.member_comment_id].push('ID_'+row.member_post_id);

		} else if(communityExpertiseNetworkIn['ID_'+row.member_comment_id].indexOf('ID_'+row.member_post_id) === -1){

			// add post member when not exist
			communityExpertiseNetworkIn['ID_'+row.member_comment_id].push('ID_'+row.member_post_id);
		}
		
	}

}

function addCommunityExpertiseNetworkOut(rows){

	// get member
	for(var i=0; i<rows.length; i++){

		// post list
		var row = rows[i];

		// add member
		if(all_member.indexOf('ID_'+row.member_comment_id) === -1){
			all_member.push('ID_'+row.member_comment_id);
		}

		if( ! communityExpertiseNetworkOut['ID_'+row.member_post_id]){

			// decare member comment
			communityExpertiseNetworkOut['ID_'+row.member_post_id] = [];
			communityExpertiseNetworkOut['ID_'+row.member_post_id].push('ID_'+row.member_comment_id);

		} else if(communityExpertiseNetworkOut['ID_'+row.member_post_id].indexOf('ID_'+row.member_comment_id) === -1){

			// add post member when not exist
			communityExpertiseNetworkOut['ID_'+row.member_post_id].push('ID_'+row.member_comment_id);
		}
		
	}
}

function query(sql, data, callback){

	// ovrloading
	if(typeof data === 'function'){

		callback = data;
		data = {};
	}

	if(data === undefined && callback === undefined){
		
		return connection.query(sql).on('error', function(err){

			console.log(sql);
			console.log(data);
			throw err;
		});
	}

	return connection.query(sql, data, function(err, rows){

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

function sort_unique(arr) {
    arr = arr.sort(function (a, b) { return a*1 - b*1; });
    var ret = [arr[0]];
    for (var i = 1; i < arr.length; i++) { // start loop at 1 as element 0 can never be a duplicate
        if (arr[i-1] !== arr[i]) {
            ret.push(arr[i]);
        }
    }
    return ret;
}

function log(obj){
	console.log(obj);
}