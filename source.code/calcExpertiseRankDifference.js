var mysql = require('mysql');
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'thesis',
	multipleStatements: true
});

var compareToTable1 = 'java_expertise_rank_fixed3';
var compareToTable2 = 'java_expertise_rank_with_likes_and_others_fixed5';

console.log('\nDIFF TABLE: '+compareToTable1+' and '+compareToTable2+'\n');

query('SELECT * FROM '+compareToTable1+' ORDER BY member_id ASC; SELECT * FROM '+compareToTable2+' ORDER BY member_id ASC;'+
	  'SELECT * FROM '+compareToTable1+' ORDER BY expertise_rank DESC; SELECT * FROM '+compareToTable2+' ORDER BY expertise_rank DESC', function(results){

	var r1 = results[0];
	var r2 = results[1];
	var re1 = results[2];
	var re2 = results[3];

	var diffArray = [];
	var diffSum = 0;

	var diffMax = -1;
	var diffMin = 999999999;

	var diffIndexArray = [];
	var diffIndexSum = 0;

	var diffIndexMax = -1;
	var diffIndexMin = 999999999;

	// setup index
	var re1_index = [];
	var re2_index = [];
	for(var i=0; i<re1.length; i++){

		re1_index.push(re1[i].member_id);
		re2_index.push(re2[i].member_id);
	}


	for (var i = 0; i < r1.length; i++) {

		var row1 = r1[i];
		var row2 = r2[i];

		if(row1.expertise_rank - row2.expertise_rank !== 0){

			// diff number
			diffArray[row1.member_id] = [row1.expertise_rank, row2.expertise_rank];
			var d = Math.max(row1.expertise_rank, row2.expertise_rank) - Math.min(row1.expertise_rank, row2.expertise_rank);

			diffSum += d;

			if(d > diffMax){
				diffMax = d;
			}

			if(d < diffMin){
				diffMin = d;
			}

			// diff index
			var row1_index = re1_index.indexOf(row1.member_id);
			var row2_index = re2_index.indexOf(row2.member_id);

			if(row1_index !== row2_index){

				diffIndexArray[row1.member_id] = [row1_index, row2_index];
				var di = Math.max(row1_index, row2_index) - Math.min(row1_index, row2_index);

				diffIndexSum += di;

				if(di > diffIndexMax){
					diffIndexMax = di;
				}

				if(di < diffIndexMin){
					diffIndexMin = di;
				}
			}
		}
	};

	//log('DIFF_ARRAY');
	//log(diffArray);
	log('DIFF_COUNT '+ Object.keys(diffArray).length);
	log('DIFF_SUM ' + diffSum);
	log('DIFF_MAX ' + diffMax + ', DIFF_MIN ' + diffMin);

	//log('DIFF_INDEX_ARRAY');
	//log(diffIndexArray);
	log('DIFF_INDEX_COUNT ' + Object.keys(diffIndexArray).length);
	log('DIFF_INDEX_SUM ' + diffIndexSum);
	log('DIFF_INDEX_MAX '+ diffIndexMax + ', DIFF_INDEX_MIN '+diffIndexMin);

});

//-----
// FUNCTION
//-----

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


function log(obj){
	console.log(obj);
}