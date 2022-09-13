function downloadAreas(user_id) {
	app.dialog.progress('Wait as system Loads Forms'); 

	// let areas_api = base_url+'get-user-region-areas?user_id='+user_id+'&format=json';
	let areas_api = base_url + 'user-region-areas?user_id=' + user_id;
	console.log(areas_api);
	app.request.getJSON(areas_api, function (area_data) {
		console.log(area_data);
		let areas = area_data.data;
		// console.log(areas);

		let regions = areas.region;
		for (var i = 0; i < regions.length; i++) {
			// Run query
			let executeQuery = 'INSERT OR REPLACE INTO region (region_id, name, code) VALUES (?,?,?);';
			let fields = [regions[i].region_id, regions[i].name, regions[i].code];
			db.transaction(function(tx) {
				tx.executeSql(executeQuery, fields);
			}, function(error) {
				console.log('Transaction ERROR: ' + error.message);
				app.dialog.alert('Transaction ERROR: ' + error.message);
				alert('Transaction ERROR: ' + error.message);
				failRegionDownload.open();
			}, function() {
				console.log('Region Succesfully Added or Updated');
				// app.toast.show({
				// 	text: 'Region Succesfully Added or Updated',
				// 	closeTimeout: 3000,
				// 	closeButton: true
				// });
			});
		}


		let districts = areas.app_district;
		for (var i = 0; i < districts.length; i++) {
			// Run query
			let executeQuery = 'INSERT OR REPLACE INTO app_district (district_id, name, region_id) VALUES (?,?,?);';
			let fields = [districts[i].district_id, districts[i].name, districts[i].region_id];
			db.transaction(function(tx) {
				tx.executeSql(executeQuery, fields);
			}, function(error) {
				console.log('Transaction ERROR: ' + error.message);
				app.dialog.alert('Transaction ERROR: ' + error.message);
				alert('Transaction ERROR: ' + error.message);
				failRegionDownload.open();
			}, function() {
				console.log('Districts Succesfully Added or Updated');
				// app.toast.show({
				// 	text: 'Districts Succesfully Added or Updated',
				// 	closeTimeout: 3000,
				// 	closeButton: true
				// });
			});
		}


		let sub_counties = areas.app_sub_county;
		for (var i = 0; i < sub_counties.length; i++) {
			// Run query
			let executeQuery = 'INSERT OR REPLACE INTO app_sub_county (sub_county_id, name, district_id) VALUES (?,?,?);';
			let fields = [sub_counties[i].sub_county_id, sub_counties[i].name, sub_counties[i].district_id];
			db.transaction(function(tx) {
				tx.executeSql(executeQuery, fields);
			}, function(error) {
				console.log('Transaction ERROR: ' + error.message);
				app.dialog.alert('Transaction ERROR: ' + error.message);
				alert('Transaction ERROR: ' + error.message);
				failRegionDownload.open();
			}, function() {
				console.log('Sub Counties Succesfully Added or Updated');
				// app.toast.show({
				// 	text: 'Sub Counties Succesfully Added or Updated',
				// 	closeTimeout: 3000,
				// 	closeButton: true
				// });
			});
		}
		let villages = areas.app_village;
		// console.log(villages);
		for (var i = 0; i < villages.length; i++) {
			// Run query
			let executeQuery = 'INSERT OR REPLACE INTO app_village (village_id, name, parish_id) VALUES (?,?,?);';
			let fields = [villages[i].village_id, villages[i].name, villages[i].parish_id];
			db.transaction(function(tx) {
				tx.executeSql(executeQuery, fields);
			}, function(error) {
				console.log('Transaction ERROR: ' + error.message);
				app.dialog.alert('Transaction ERROR: ' + error.message);
				alert('Transaction ERROR: ' + error.message);
				failRegionDownload.open();
			}, function() {
				console.log('Villages Succesfully Added or Updated');
				// app.toast.show({
				// 	text: 'Villages Succesfully Added or Updated',
				// 	closeTimeout: 3000,
				// 	closeButton: true
				// });
				//
				
			});

		}
		

		let parishes = areas.app_parish;
		for (var i = 0; i < parishes.length; i++) {
			// Run query
			let executeQuery = 'INSERT OR REPLACE INTO app_parish (parish_id, name, sub_county_id) VALUES (?,?,?);';
			let fields = [parishes[i].parish_id, parishes[i].name, parishes[i].sub_county_id];
			db.transaction(function(tx) {
				tx.executeSql(executeQuery, fields);
			}, function(error) {
				console.log('Transaction ERROR: ' + error.message);
				app.dialog.alert('Transaction ERROR: ' + error.message);
				alert('Transaction ERROR: ' + error.message);
				failRegionDownload.open();
			}, function() {
				console.log('Parishes Succesfully Added or Updated');
				app.dialog.close();
				// app.toast.show({
				// 	text: 'Parishes Succesfully Added or Updated',
				// 	closeTimeout: 3000,
				// 	closeButton: true
				// });
			});
		}

		
	
	});


}
function downloadRegionEntries(region_id, form_id) {
	app.dialog.progress('Fetching all etries for this region, it will take about 2 minutes');
	

	let organisations_api = base_url + 'entry/getRegionalEntries?region_id=' + parseInt(region_id) + '&form_id=' + parseInt(form_id);
	console.log(organisations_api);
	app.request.getJSON(organisations_api, function (organisation_data) {
		console.log(organisation_data);
		let organisations = organisation_data.data.reverse();
		for (var i = 0; i < organisations.length; i++) {
			let status = 1100;
			let is_creator = organisations[i].creator_id == app_user.user_id ? 1 : 0 ;
			// Run query

	 		let executeQuery = 'INSERT OR REPLACE INTO entry (entry_id, form_id, title, subtitle, responses, status, created_at) VALUES (?,?,?,?,?,?,?);';
	        let fields = [organisations[i].response_id, organisations[i].form_id, organisations[i].title, organisations[i].sub_title, JSON.stringify(organisations[i].responses),  status, is_creator];
		    db.transaction(function(tx) {
				tx.executeSql(executeQuery, fields);
			}, function(error) {
				console.log('Transaction ERROR: ' + error.message);
				app.dialog.alert('Transaction ERROR: ' + error.message);
				alert('Transaction ERROR: ' + error.message);
				failRegionDownload.open();
			
			},
			function() {
				app.dialog.close();
				}
			
			);
			
		}
	});
	
}

// function downloadRegionEntries(region_id, form_id) {	
// 	var dialog = app.dialog.progress('Fetching all etries for this region, it will take about 2 minutes');
// 	let organisations_api = base_url + 'entry/downloadable_region_entries?region_id=' + parseInt(region_id) + '&form_id=' + parseInt(form_id);
// 	console.log(organisations_api);
// 	app.request.getJSON(organisations_api, function (organisation_data) {
// 		console.log(organisation_data);
// 		let organisations = organisation_data.data;
// 		for (var i = 0; i < organisations.length; i++) {
// 			let status = 1100;
// 			let is_creator = organisations[i].creator_id == app_user.user_id ? 1 : 0 ;
// 			// Run query

// 	 		let executeQuery = 'INSERT OR REPLACE INTO entry (entry_id, form_id, title, subtitle, responses, status, created_at) VALUES (?,?,?,?,?,?,?);';
// 	let fields = [organisations[i].entry_id, organisations[i].form_id, organisations[i].title, organisations[i].sub_title, organisations[i].json_response,  status, is_creator];
// 		    db.transaction(function(tx) {
// 				tx.executeSql(executeQuery, fields);
// 			}, function(error) {
// 				console.log('Transaction ERROR: ' + error.message);
// 				app.dialog.alert('Transaction ERROR: ' + error.message);
// 				alert('Transaction ERROR: ' + error.message);
				
// 			});
// 		}

		
// 		//app.router.refreshPage();
// 	});
// 	// console.log(organisations_api);
// 	// app.request.getJSON(organisations_api, function (organisation_data) {
// 	// 	console.log(organisation_data);
// 	// 	let organisations = organisation_data.data;
// 	// 	for (var i = 0; i < organisations.length; i++) {
// 	// 		let status = 1100;
// 	// 		let is_creator = organisations[i].creator_id == app_user.user_id ? 1 : 0 ;
// 	// 		// Run query
// 	// 		let executeQuery = 'INSERT OR REPLACE INTO entry (entry_id, form_id, entry_title, entry_subtitle, json_entry_data, json_entry_followup_data, status, is_creator, date_created, date_modified) VALUES (?,?,?,?,?,?,?,?,?,?);';
// 	// 		let fields = [organisations[i].entry_form_id, organisations[i].form_id, organisations[i].title, organisations[i].sub_title, organisations[i].json_response, organisations[i].json_followup, status, is_creator, organisations[i].date_created, organisations[i] .date_modified];
// 	// 	    db.transaction(function(tx) {
// 	// 			tx.executeSql(executeQuery, fields);
// 	// 		}, function(error) {
// 	// 			console.log('Transaction ERROR: ' + error.message);
// 	// 			app.dialog.alert('Transaction ERROR: ' + error.message);
// 	// 			alert('Transaction ERROR: ' + error.message);
// 	// 			failRegionDownload.open();
// 	// 		}, function() {
// 	// 			console.log('Organisations Succesfully Added or Updated');
// 	// 			app.toast.show({
// 	// 				text: 'Organisations Succesfully Added or Updated',
// 	// 				closeTimeout: 3000,
// 	// 				closeButton: true
// 	// 			});
// 	// 		});
// 	// 	}
// 	// });
// 	console.log('Entries Succesfully Downloaded');
// 		dialog.close()
// 		app.toast.show({
// 			text: 'Entries Succesfully Downloaded',
// 			closeTimeout: 3000,
// 			closeButton: true
// 		});
// }


// function downloadRegionEntries(region_id, form_id) {	
// 	var dialog = app.dialog.progress('Fetching Data');
// 	// let form_request_url = base_url + 'get-region-responses?region_id=' + region_id + '&form_id=' + form_id + '&modified=30';
// 	let form_request_url = base_url + 'entry/downloadable-region-entries?region_id=' + region_id + '&form_id=' + form_id;


// 	app.request.getJSON(form_request_url, function (sync_data) {
// 		// console.log(sync_data);
// 		console.log('Data Fetched');
// 		dialog.close();	

// 		if (sync_data.status) {
// 			let entries = sync_data.data;
// 			for (var i = 0; i < entries.length; i++) {
// 				// console.log(entries[i]);
// 				let entry = entries[i];
// 				let status = 1100;
// 				let is_creator = entry.creator_id == app_user.user_id ? 1 : 0 ;

// 				db.transaction(function(tx) {
// 					tx.executeSql('INSERT OR REPLACE INTO entry (entry_id, form_id, entry_title, entry_subtitle, json_entry_data, json_entry_followup_data, status, is_creator, date_created, date_modified) VALUES (?,?,?,?,?,?,?,?,?,?)', [entry.entry_form_id, entry.form_id, entry.title, entry.sub_title, entry.json_response, entry.json_followup, status, is_creator, entry.date_created, entry.date_modified]);
// 				}, function(error) {
// 					console.log('Transaction ERROR: ' + error.message);
// 					app.dialog.alert('Transaction ERROR: ' + error.message);
// 				}, function() {
// 					console.log('Entry '+entry.entry_form_id+' succesfully downloaded');
// 				});
// 			}
// 		} else {					
// 			app.toast.show({text: 'Previously downloaded', closeTimeout: 3000, closeButton: true});
// 			console.log('Previously downloaded');
// 		}
// 	});
// }



function downloadProjects() {

	// let projects_api = base_url+'get-region-projects?region_id='+region_id+'&format=json';
	// let projects_api = base_url + 'get-projects?format=json';
	let projects_api = base_url + 'projects';
	console.log(projects_api);
	app.request.getJSON(projects_api, function (project_data) {
		console.log(project_data);
		// let projects = project_data.data;
		// console.log(projects);

		let projects = project_data.data;
		for (var i = 0; i < projects.length; i++) {
			// Run query
			let executeQuery = 'INSERT OR REPLACE INTO app_project (project_id, name) VALUES (?,?);';
			let fields = [projects[i].project_id, projects[i].name];
			db.transaction(function(tx) {
				tx.executeSql(executeQuery, fields);
			}, function(error) {
				console.log('Transaction ERROR: ' + error.message);
				app.dialog.alert('Transaction ERROR: ' + error.message);
				alert('Transaction ERROR: ' + error.message);
				failRegionDownload.open();
			}, function() {
				console.log('Projects Succesfully Added or Updated');
				// app.toast.show({
				// 	text: 'Projects Succesfully Added or Updated',
				// 	closeTimeout: 3000,
				// 	closeButton: true
				// });
			});
		}
	});
}


function downloadOrganisations() {

	// let projects_api = base_url+'get-region-projects?region_id='+region_id+'&format=json';
	// let organisations_api = base_url + 'get-organisations?format=json';
	let organisations_api = base_url + 'organisations';
	console.log(organisations_api);
	app.request.getJSON(organisations_api, function (organisation_data) {
		console.log(organisation_data);
		// let organisations = organisation_data.data;
		// console.log(organisations);

		let organisations = organisation_data.data;
		for (var i = 0; i < organisations.length; i++) {
			// Run query
			let executeQuery = 'INSERT OR REPLACE INTO app_organisation (organisation_id, name) VALUES (?,?);';
			let fields = [organisations[i].organisation_id, organisations[i].name];
			db.transaction(function(tx) {
				tx.executeSql(executeQuery, fields);
			}, function(error) {
				console.log('Transaction ERROR: ' + error.message);
				app.dialog.alert('Transaction ERROR: ' + error.message);
				alert('Transaction ERROR: ' + error.message);
				failRegionDownload.open();
			}, function() {
				console.log('Organisations Succesfully Added or Updated');
				// app.toast.show({
				// 	text: 'Organisations Succesfully Added or Updated',
				// 	closeTimeout: 3000,
				// 	closeButton: true
				// });
			});
		}
	});
}


function buildSelect(db_table) {
	let id_field = '';
	switch(db_table) {
		case 'region':
			id_field = 'region_id';
			break;
		case 'app_district':
			id_field = 'district_id';
			break;
		case 'app_sub_county':
			id_field = 'sub_county_id';
			break;
		case 'app_parish':
			id_field = 'parish_id';
			break;
		case 'app_village':
			id_field = 'village_id';
			break;
		case 'app_project':
			id_field = 'project_id';
			break;
		case 'app_organisation':
			id_field = 'organisation_id';
			break;
		default:
			id_field = '';
	}

	let executeQuery = 'SELECT * FROM '+db_table+';';
	let fields = [];
	db.transaction(function(transaction) {
		transaction.executeSql(executeQuery, fields, 
			function(tx, result) {
				let dom_str = '<option data-area-id="" value="">Select</option>\n';
				for (var i = 0; i < result.rows.length; i++) {
					dom_str += '<option data-area-id="'+result.rows.item(i)[id_field]+'" value="'+result.rows.item(i).name+'">'+result.rows.item(i).name+'</option>\n';
				}
				console.log(dom_str);
				$$('.app-list[data-db-table="'+db_table+'"]').html(dom_str);
			},
			function(error) {
				console.log(error);
			}
		);
	});


}




function buildChildSelect(db_table, parent_id) {
	let id_field = '';
	let child_field = '';
	let reset = [];
	switch(db_table) {
		case 'region':
			parent_field = 'region_id';
			child_table = 'app_district';
			id_field = 'district_id';
			reset = ['app_sub_county', 'app_parish', 'app_village'];
			break;
		case 'app_district':		
			parent_field = 'district_id';
			child_table = 'app_sub_county';
			id_field = 'sub_county_id';
			reset = ['app_parish', 'app_village'];
			break;
		case 'app_sub_county':		
			parent_field = 'sub_county_id';
			child_table = 'app_parish';
			id_field = 'parish_id';
			reset = ['app_village'];
			break;
		case 'app_parish':		
			parent_field = 'parish_id';
			child_table = 'app_village';
			id_field = 'village_id';
			reset = [];
			break;
		default:		
			parent_field = '';
			child_table = '';
			id_field = '';
			reset = [];
	}

	if (child_table != '') {
		let executeQuery = 'SELECT * FROM '+child_table+' WHERE '+parent_field+' = ?;';
		let fields = [parent_id];
		db.transaction(function(transaction) {
			transaction.executeSql(executeQuery, fields, 
				function(tx, result) {
					let dom_str = '<option data-area-id="" value="">Select</option>\n';
					for (var i = 0; i < result.rows.length; i++) {
						dom_str += '<option data-area-id="'+result.rows.item(i)[id_field]+'" value="'+result.rows.item(i).name+'">'+result.rows.item(i).name+'</option>\n';
					}
					console.log(dom_str);
					$$('.app-list[data-db-table="'+child_table+'"]').removeAttr('disabled').html(dom_str);

					// Reset child fields
					for (var i = 0; i < reset.length; i++) {					
						$$('.app-list[data-db-table="'+reset[i]+'"]').html('').attr('disabled','disabled');
					}
				},
				function(error) {
					console.log(error);
				}
			);
		});
	}


}