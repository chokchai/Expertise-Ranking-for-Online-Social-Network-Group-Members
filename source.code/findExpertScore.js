var fs = require('fs');
var mysql = require('mysql');
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'thesis',
	multipleStatements: true
});

var expertFile = 'expert_list.txt';
var table = 'java_expertise_rank_fixed3';

var expertFile = cleanList(fs.readFileSync(expertFile, 'utf8').split('\r\n'));
var minExpertise = 0;
var sortedExpert = [];
var identifyExpert = [];

// find min expertise socre for expert identify
query('SELECT COUNT(member_id) AS member_count FROM '+table, function(rows){

	var mc = parseInt(rows[0].member_count/5)*2;

	log('\n=================================');
	log('\nTABLE: '+table);
	log('\nROWS_COUNT: '+rows[0].member_count);
	log('\nEXPERT_MIN_INDEX: '+mc);	
	
	query('SELECT * FROM '+table+' ORDER BY expertise_rank DESC LIMIT '+mc+', 1', function(rows){
		
		minExpertise = rows[0].expertise_rank;

		log('\nEXPERT_MIN_SCORE: '+minExpertise);
		log('\n=================================');

		// find all expertise score
		var choiceIndex = 1;
		(function eachAnswer(){
			
			if(expertFile.length > 0){
				expertiseAnalysis(expertFile.shift().split(','), eachAnswer, choiceIndex++);
			} else {

				log('\nSORTED EXPERT OUTPUT:');
				for(i in sortedExpert){
					log(sortedExpert[i]);
				}

				log('\nINDENTIFY EXPERT OUTPUT: ');
				for(i in identifyExpert){
					log(identifyExpert[i]);
				}

				process.exit();
			}

		})();

	})
});

//----- FUNCTION -----//

function expertiseAnalysis(expertList, callback, index){

	log('\n#'+index);

	var expertiseList = [];
	var expertiseIdList = [];
	var counter = 0;

	for(j in expertList){
		query('SELECT * FROM '+table+" WHERE member_id = 'ID_"+expertList[j]+"'", 
			{ expert_id: expertList[j] },
			function(rows, err, data){

				if(rows.length === 0){
					log(data.expert_id+' is undefined.');
				} else {
					expertiseList.push(rows[0].expertise_rank);
					expertiseIdList.push(data.expert_id);
				}

				counter++;
			}
		).on('end', function(err){

			if(counter == expertList.length){

				log('\nINDEX:');

				for(i in expertiseList){
					log('('+memberName(expertiseList[i],expertiseList)+')'+expertiseIdList[i]+' = '+expertiseList[i]);
				}



				log('\nSORTED:');

				var cExpertiseList = clone(expertiseList);
				cExpertiseList = cExpertiseList.sort(function(a,b){ return a < b });

				var sortList = '';
				for(i in cExpertiseList){
					sortList += memberName(cExpertiseList[i], expertiseList);
				}

				log(sortList);

				log('\nEXPERT:');
				var expList = '';
				for(i in expertiseList){
					if(expertiseList[i] > minExpertise){
						expList += memberName(expertiseList[i], expertiseList);
					}
				}

				log(expList);

				function memberName(expertiseScore, expertiseList){

					var index = expertiseList.indexOf(expertiseScore);

					switch(index){
						case 0: return 'A';
						case 1: return 'B';
						case 2: return 'C';
						case 3: return 'D';
						case 4: return 'E';
					}
				}

				sortedExpert.push(sortList);
				identifyExpert.push(expList);

				callback();
			}
		});
	}
}

function log(obj){
	console.log(obj);
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

		//console.log('QUERY: '+sql);
		//console.log(data);
		//console.log('\n');

		if(typeof callback === 'function'){

			callback(rows, err, data);
		}
		
	});

}

function cleanList(arr){
	
	var array = [];
	
	arr.forEach(function(val){
		val = val.trim();
		if(val !== '' && val.indexOf('#') === -1 && val.indexOf('//') === -1){
			array.push(val);
		}
	});

	return array;
}

function clone(obj){
    if(obj == null || typeof(obj) != 'object')
        return obj;

    var temp = obj.constructor(); // changed

    for(var key in obj)
        temp[key] = clone(obj[key]);
    return temp;
}