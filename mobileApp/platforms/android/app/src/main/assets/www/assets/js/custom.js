// SQLite Functions
function onDeviceReady() {
	db.transaction(function(tx) {
		tx.executeSql('CREATE TABLE IF NOT EXISTS user (user_id integer primary key, first_name text, last_name text, email text, password text, region_id integer, region_name text, region_code text, settings text, logged_in integer)');
		tx.executeSql('CREATE TABLE IF NOT EXISTS form (form_id integer primary key, title text, question_list text, entry_title text, entry_subtitle text, conditional_logic text, is_geotagged integer, is_photograph integer, is_followup integer, followup_prefill text, followup_interval integer, created_at text, updated_at text)');
		tx.executeSql('CREATE TABLE IF NOT EXISTS entry (entry_id text primary key, form_id integer, title text, subtitle text, responses text, status integer, created_at text)');		

		// Custom AWS Tables
		tx.executeSql('CREATE TABLE IF NOT EXISTS region (region_id integer primary key, name text, code text)');
		tx.executeSql('CREATE TABLE IF NOT EXISTS app_district (district_id integer primary key, name text, region_id integer)');
		tx.executeSql('CREATE TABLE IF NOT EXISTS app_sub_county (sub_county_id integer primary key, name text, district_id integer)');
		tx.executeSql('CREATE TABLE IF NOT EXISTS app_parish (parish_id integer primary key, name text, sub_county_id integer)');
		tx.executeSql('CREATE TABLE IF NOT EXISTS app_village (village_id integer primary key, name text, parish_id integer)');
		tx.executeSql('CREATE TABLE IF NOT EXISTS app_project (project_id integer primary key, name text)');
		tx.executeSql('CREATE TABLE IF NOT EXISTS app_organisation (organisation_id integer primary key, name text)');
	});

/* ===========================================================
	UPDATE DATABASE SCRIPT STARTS HERE
   =========================================================== */

	// Check if "entry" table column "json_entry_data" exists
	// If exists, rename table to "entry_old"
	// Then create new table "entry"
	// Run scritp to migrate date from "entry_old" to "entry"
	// If column does not exist, create new "entry" table
	let executeQuery = "SELECT count(*) AS tables FROM sqlite_master WHERE type='table' AND name='entry_old';";
	let fields = [];
	db.transaction(function (transaction) {
		transaction.executeSql(executeQuery, fields,
			function (tx, result) {
				// console.log(result.rows.item(0));
				if (result.rows.item(0).tables == 0) {
					console.log('entry_old does not exist');

					let executeQuery2 = "SELECT count(title) AS counter FROM entry;";
					let fields2 = [];
					db.transaction(function (transaction2) {
						transaction2.executeSql(executeQuery2, fields2,
							function (tx2, result2) {
								console.log(result.rows.item(0));
								if (result2.rows.item(0).counter == 0) {

									console.log('Rename entry table, create new entry table and migrate entries');
									// tx.executeSql('ALTER TABLE entry RENAME TO entry_old;');
									// tx.executeSql('CREATE TABLE IF NOT EXISTS entry (entry_id text primary key, form_id integer, title text, subtitle text, responses text, status integer, created_at text)');
									// migrateEntries();

									console.log('Drop form table and download new forms');
									// tx.executeSql('DROP TABLE IF EXISTS form;');
									// tx.executeSql('CREATE TABLE IF NOT EXISTS form (form_id integer primary key, title text, question_list text, entry_title text, entry_subtitle text, conditional_logic text, is_geotagged integer, is_photograph integer, is_followup integer, followup_prefill text, followup_interval integer, created_at text, updated_at text)');
									// downloadForms();
								} else {
									console.log('Already updated to new version of entry and form tables');
								}

							},
							function (tx2, error2) {
								console.log(error2.message);
								db.transaction(function (tx3) {
									console.log('Backup entry table');
									// tx3.executeSql('DROP TABLE IF EXISTS entry_bak;');
									tx3.executeSql('CREATE TABLE IF NOT EXISTS entry_bak (entry_id text primary key, form_id integer, entry_title text, entry_subtitle text, json_entry_data text, json_entry_followup_data text, status integer, is_creator integer, date_created text, date_modified text)', [], 
										function (tx4, results) {
											tx4.executeSql("INSERT INTO entry_bak SELECT * FROM entry;", [], function (tx, results) {
												console.log('Entry table backup was successful');

												console.log('Rename entry table to entry_old');
												tx4.executeSql('ALTER TABLE entry RENAME TO entry_old;', [], function (tx, results) {}, function (tx, error) {console.log(error.message)});
												
												console.log('Create new entry table');
												tx4.executeSql('CREATE TABLE IF NOT EXISTS entry (entry_id text primary key, form_id integer, title text, subtitle text, responses text, status integer, created_at text)', [], function (tx, results) {}, function (tx, error) {console.log(error.message)});
												console.log('Migrate entries');
												migrateEntries();

											});
											
										}, function (tx4, err) {
											console.log(err.message);
									});

									console.log('Drop form table and download new forms');
									tx3.executeSql('DROP TABLE IF EXISTS form;');
									tx3.executeSql('CREATE TABLE IF NOT EXISTS form (form_id integer primary key, title text, question_list text, entry_title text, entry_subtitle text, conditional_logic text, is_geotagged integer, is_photograph integer, is_followup integer, followup_prefill text, followup_interval integer, created_at text, updated_at text)');
									downloadForms();
								});
							}
						);
					});
					
					
				} else {
					console.log('Upgrade already made');
				}
			},
			function (tx, error) {
				console.log(error.message);
			}
		);
	});

/* ===========================================================
	UPDATE DATABASE SCRIPT ENDS HERE
	=========================================================== */



}


function autoLogin() {
	let executeQuery = 'SELECT * FROM user WHERE logged_in = ?;';
	let fields = [1];
	db.transaction(function(transaction) {
		transaction.executeSql(executeQuery, fields, 
			function(tx, result) {
				if (result.rows.length == 1) {
					app_user = result.rows.item(0);
					// app_user.logged_in = 1;
					entry_prefix = 'AWS-'+app_user.region_code+'-U'+leadZeros(app_user.user_id, 4)+'-';
					// Set template7 global variables
					Template7.global = {app_user: app_user};
					mainView.router.navigate('/home/');
					app.progressbar.hide();
				} else {
					//display login screen
					mainView.router.navigate('/slide/');
					app.progressbar.hide();
				}
			},
			function (tx, error) {
				console.log(error);
			}
		);
	});
}


function authenticate(username, password) {
	let authenticate_url = base_url+'user/authenticate';
	let credentials = {username:username, password:password};
	app.request.post(authenticate_url, credentials, function(user_data) {
		// console.log(user_data);
		let auth_data = JSON.parse(user_data);
		if (auth_data.status) {
			let user = auth_data.data;
			// Insert into db
			let executeQuery = 'INSERT OR REPLACE INTO user(user_id, first_name, last_name, email, password, region_id, region_name, region_code, settings, logged_in) VALUES(?,?,?,?,?,?,?,?,?,?);';
			let fields = [user.user_id, user.first_name, user.last_name, user.email, user.password, user.region_id, user.region_name, user.code, user.settings, 1];
			db.transaction(function(tx) {
				tx.executeSql(executeQuery, fields);
			}, function(error) {
				console.log('Transaction ERROR: ' + error.message);
				// app.dialog.alert('Transaction ERROR: ' + JSON.stringify(error.message));
				$$('#message-wrapper').text('Transaction ERROR: ' + JSON.stringify(error.message));
			}, function() {
				console.log('User Succesfully Added or Updated');
				// App user vars
					

				app_user = {user_id: user.user_id, first_name: user.first_name, last_name: user.last_name, email: user.email, password: user.password, region_id: user.region_id, region_name: user.region_name, region_code: user.code, settings: user.settings, logged_in: 1};
				entry_prefix = 'AWS-'+app_user.code+'-U'+leadZeros(app_user.user_id, 4)+'-';
				// Download Data
				
				downloadAreas(user.user_id);
				downloadProjects();
				downloadOrganisations();
				downloadForms();
				// downloadProjects(user.region_id);
				// Set template7 global variables
				Template7.global = {app_user: app_user};
				mainView.router.navigate('/home/');
				//app.progressbar.hide();
				dialog.close();	
			});
		} else {
			app.progressbar.hide();
			// Auth status resolved to false
			app.toast.show({
				text: auth_data.message,
				closeTimeout: 3000
			});
		}
	}, function(err) {
		console.log(err);
		app.dialog.alert(err);
	});
}


function downloadForms() {
	//app.dialog.progress();
	console.log('Downloading Forms');

	let executeQuery = 'DELETE FROM form;';
	let fields = [];
	db.transaction(function(transaction) {
		transaction.executeSql(executeQuery, fields, 
			function(tx1, result) {

				// let form_request_url = base_url + 'get-published-forms';
				let form_request_url = base_url + 'forms?published=1';
				app.request.getJSON(form_request_url, function (response_data) {

					// let clean_forms;
					let forms = response_data.data;
					for (var i = 0; i < forms.length; i++) {

						// let form_id = forms[i].form_id;
						// let title = forms[i].title;
						// let is_followup = forms[i].is_followup == 1 ? forms[i].is_followup : 0;
						// let json_questions = JSON.stringify(forms[i].question_list);
						// let entry_title = JSON.stringify(forms[i].title_fields.entry_title);
						// let entry_subtitle = JSON.stringify(forms[i].title_fields.entry_sub_title);
						// let is_geotagged = forms[i].is_geotagged;
						// let is_photograph = forms[i].is_photograph;
						// let followup_prefill = JSON.stringify(forms[i].followup_prefill);
						// let date_created = forms[i].date_created;
						// let date_modified = forms[i].date_modified;


						let form_id = forms[i].form_id;
						let title = forms[i].title;
						let question_list = JSON.stringify(forms[i].question_list);
						let entry_title = JSON.stringify(forms[i].title_fields.entry_title);
						let entry_subtitle = JSON.stringify(forms[i].title_fields.entry_sub_title);
						let conditional_logic = JSON.stringify(forms[i].conditional_logic);
						let is_geotagged = forms[i].is_geotagged;
						let is_photograph = forms[i].is_photograph;
						let is_followup = forms[i].is_followup == 1 ? forms[i].is_followup : 0;
						let followup_prefill = JSON.stringify(forms[i].followup_prefill);
						let followup_interval = forms[i].followup_interval;
						let created_at = forms[i].created_at;
						let updated_at = forms[i].updated_at;


						// Run query
						// let executeQuery = 'INSERT OR REPLACE INTO form (form_id, is_followup, title, entry_title, entry_subtitle, json_questions, is_geotagged, is_photograph, followup_prefill, date_created, date_modified) VALUES (?,?,?,?,?,?,?,?,?,?,?);';
						// let fields = [form_id, is_followup, title, entry_title, entry_subtitle, json_questions, is_geotagged, is_photograph, followup_prefill, date_created, date_modified];
						
						let executeQuery = 'INSERT OR REPLACE INTO form (form_id, title, question_list, entry_title, entry_subtitle, conditional_logic, is_geotagged, is_photograph, is_followup, followup_prefill, followup_interval, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?);';
						let fields = [form_id, title, question_list, entry_title, entry_subtitle, conditional_logic, is_geotagged, is_photograph, is_followup, followup_prefill, followup_interval, created_at, updated_at];
						db.transaction(function(tx) {
							tx.executeSql(executeQuery, fields);
						}, function(error) {
							console.log(error);
							console.log('Transaction ERROR: ' + error.message);
						}, function() {
							console.log('Form ' + title + question_list+' Succesfully Inserted');
							// mainView.router.navigate('/home/');
							// mainView.router.refreshPage();

						});
					}
					console.log(forms.length+' Forms Succesfully Transfered');
			
					mainView.router.navigate('/home/');
				});

			},
			function(error) {
				console.log(error);
			}
		);
	});

}


function appLogout() {
	app.dialog.confirm('Are you sure you want to log out?', 'Oops!!', function() {
		let executeQuery = 'UPDATE user SET logged_in = ? WHERE user_id = ? AND logged_in = ?;';
		let fields = [0, app_user.user_id, 1];
		db.transaction(function(transaction) {
			transaction.executeSql(executeQuery, fields, 
				function(tx, result) {
					app.panel.close();
					app_user = undefined;
					mainView.router.navigate('/sign-in/');
				},
				function (tx, error) {
					app.dialog.alert('Logout: SQL query ERROR: ' + error.message);
				}
			);
		});
	});
}




// function backSync(user_id) {
// 	db.transaction(function(tx) {
// 		tx.executeSql('SELECT count(*) AS entry_count FROM entry', [], function(tx, rs) {
// 			console.log('Record count (Table: entry): ' + rs.rows.item(0).entry_count);
// 			if (rs.rows.item(0).entry_count == 0) {
// 				let form_request_url = base_url+'get-user-responses?user_id='+user_id+'&format=json';
// 				app.request.getJSON(form_request_url, function (sync_data) {
// 					// console.log(sync_data);
// 					if (sync_data.status) {
// 						let entries = sync_data.data;
// 						for (var i = 0; i < entries.length; i++) {
// 							console.log(entries[i]);
// 							if (sync_data.status) {
// 								let entry = entries[i];
// 								let followup = JSON.parse(entry.json_followup);
// 								let status = followup.length > 0 ? 1110 : 1100;
// 								let is_creator = 1;
// 								db.transaction(function(tx) {
// 									tx.executeSql('INSERT INTO entry (entry_id, form_id, entry_title, entry_subtitle, json_entry_data, json_entry_followup_data, status, is_creator, date_created, date_modified) VALUES (?,?,?,?,?,?,?,?,?,?)', [entry.entry_form_id, entry.form_id, entry.title, entry.sub_title, entry.json_response, entry.json_followup, status, is_creator, entry.date_created, entry.date_modified]);
									
									
// 									// tx.executeSql('INSERT INTO entry (entry_id, form_id, response, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [entry.entry_form_id, entry.form_id, entry.title, entry.sub_title, entry.json_response, entry.json_followup, status, is_creator, entry.date_created, entry.date_modified]);




// 								}, function(error) {
// 									console.log('Transaction ERROR: ' + error.message);
// 									app.dialog.alert('Transaction ERROR: ' + error.message);
// 								}, function() {
// 									console.log('Entry '+entry.entry_form_id+' succesfully synced back');
// 								});
// 							} else {
// 								console.log('No data available');
// 							}
// 						}

// 						app.toast.show({
// 							text: 'Data succesfully restored',
// 							closeTimeout: 3000
// 						});

// 					} else {
// 						console.log('No data to sync back');
// 					}
// 				});
// 			}
// 		}, function(tx, error) {
// 			console.log('SELECT error: ' + error.message);
// 		});
// 	});
// }


































function clean_obj(result) {
	let obj = [];
	for (var i = 0; i < result.rows.length; i++) {
		obj.push(result.rows.item(i));
	}
	return obj;
}

function leadZeros(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length-size);
}

function geoLocation() {
	navigator.geolocation.getCurrentPosition(function(pos) {
		console.log('first check if field is empty')
		latitude = pos.coords.latitude;
		longitude = pos.coords.longitude;
		$$('#form-geo-coordinates').val(latitude+','+longitude);
	}, function(err) {
		alert(err.message);
	}, { enableHighAccuracy: true });
}

function photoPath() {
	navigator.camera.getPicture(function(cached_photo_path) {
		console.log(cached_photo_path);
		$$('input[name="photo"]').val(cached_photo_path);
		$$('#capture-photo').attr('src',cached_photo_path);
	}, function(err) {
		console.log(err);
	}, { quality: 50, destinationType: Camera.DestinationType.FILE_URI });
}

function mapData(form, formData) {
	// console.log(formData);
	let map = [];
	for (var i = 0; i < form.questions.length; i++) {
		let key = 'qn'+form.questions[i].question_id;
		let answers = formData[key];

		// if (false) {
		// 	let formatted_answers = '';
		// 	for(var k in answers) {
		// 		formatted_answers += '<span class="display-block">'+answers[k]+'</span>';
		// 	}
		// } else {
		// 	let formatted_answers = '<span class="display-block">'+answers+'</span>';
		// }

		let formatted_answers = '<span class="display-block">'+answers+'</span>';
		map.push({question: form.questions[i].question, answers: formatted_answers});
	}
	return map;
}

// function obj2array(obj) {
// 	let arr = [];
// 	for(var key in obj) {
// 		arr[key] = obj
// 	}

// }


function checkEntryFields(entryData) {
	let entry = Object.values(entryData);
	for (var value of entry) {
		if(value == "" || value === "") {
			return false;
		}
	}
	return true;
}


function saveEntry(data, action) {
	console.log(data);

	// let executeQuery = 'SELECT entry_title, entry_subtitle FROM form WHERE form_id = ?;';
	let executeQuery = 'SELECT * FROM form WHERE form_id = ?;';
	let fields = [data.form_id];
	db.transaction(function(transaction) {
		transaction.executeSql(executeQuery, fields, 
			function(tx, result) {
				console.log(result);


				let form = result.rows.item(0);
				console.log(form);

				// let formData = JSON.parse(data.responses);
				let formData = data.responses;
				let titles = title_maker(form, formData);
				console.log(titles);

				data.title = titles.title ?? 'Unknown Title';
				data.subtitle = titles.subtitle ?? 'Unknown Sub Title';
				data.responses = JSON.stringify(formData);

				console.log(data);

				// let entry_title = JSON.parse(form.entry_title);
				// let entry_subtitle = JSON.parse(form.entry_subtitle);

				// //  Create entry title
				// for (var i = 0; i < entry_title.length; i++) {
				// 	let key = 'qn'+entry_title[i];
				// 	data.entry_title += formData[key]+' ';
				// }

				// //  Create entry sub title
				// for (var i = 0; i < entry_subtitle.length; i++) {
				// 	let key = 'qn'+entry_subtitle[i];
				// 	data.entry_subtitle += formData[key]+' ';
				// }

				// data.entry_title = data.entry_title.slice(0, -1);
				// data.entry_subtitle = data.entry_subtitle.slice(0, -1);

				let commit_entry = (action === 'save-commit-btn') ? true : false;
				insertEntry(data, commit_entry);
			},
			function (tx, error) {
				console.log(error);
				app.dialog.alert('Save Entry: SQL query ERROR: ' + error.message);
			}
		);
	});
}









function insertEntry(entry, commit_entry = false) {
	db.transaction(function(tx1) {
		// Check if entry exists
		let executeQuery = 'SELECT count(*) AS record_count FROM entry WHERE form_id = ? AND responses = ? AND status = ? AND created_at = ?';
		let fields = [entry.form_id, entry.responses, entry.status, entry.created_at];
		tx1.executeSql(executeQuery, fields, function (tx2, result) {
			console.log(result.rows.item(0).record_count + ' record(s) found');
			// Create new entry response
			if (result.rows.item(0).record_count == 0) {

				db.transaction(function (tx3) {
					tx3.executeSql('INSERT INTO entry (entry_id, form_id, title, subtitle, responses, status, created_at) VALUES (?,?,?,?,?,?,?);', [entry.entry_id, entry.form_id, entry.title, entry.subtitle, entry.responses, entry.status, entry.created_at]);
				}, function (error) {
					console.log('Transaction ERROR: ' + error.message);
				}, function () {
					console.log('Entry Inserted');
					// Commit is flagged for commiting
					if (commit_entry) {
						commitEntry(entry.entry_id);
					}
				});

			} else {
				app.toast.show({
					text: 'This record already exists',
					closeTimeout: 3000
				});
			}

		}, function (tx2, error) {
			console.log(error.message);
		});















		// // let executeQuery = 'SELECT count(*) AS record_count FROM entry WHERE entry_id = ? AND form_id = ? AND entry_title = ? AND entry_subtitle = ? AND json_entry_data = ? AND json_entry_followup_data = ? AND status = ?  AND is_creator = ? AND date_created = ? AND date_modified = ?;';
		// // let fields = [entry.entry_id, entry.form_id, entry.entry_title, entry.entry_subtitle, entry.json_entry_data, entry.json_entry_followup_data, entry.status, entry.is_creator, entry.date_created, entry.date_modified];
		// let executeQuery = 'SELECT count(*) AS record_count FROM entry WHERE form_id = ? AND entry_title = ? AND entry_subtitle = ? AND json_entry_data = ? AND json_entry_followup_data = ? AND status = ?  AND is_creator = ?;';
		// let fields = [entry.form_id, entry.entry_title, entry.entry_subtitle, entry.json_entry_data, entry.json_entry_followup_data, entry.status, entry.is_creator];
		// tx1.executeSql(executeQuery, fields, function(tx2, result) {
		// 	console.log(result.rows.item(0).record_count +' record(s) found');
		// 	if (result.rows.item(0).record_count == 0) {
		// 		db.transaction(function(tx3) {
		// 			tx3.executeSql('INSERT INTO entry (entry_id, form_id, entry_title, entry_subtitle, json_entry_data, json_entry_followup_data, status, is_creator, date_created, date_modified) VALUES (?,?,?,?,?,?,?,?,?,?);', [entry.entry_id, entry.form_id, entry.entry_title, entry.entry_subtitle, entry.json_entry_data, entry.json_entry_followup_data, entry.status, entry.is_creator, entry.date_created, entry.date_modified]);
		// 		}, function(error) {
		// 			console.log('Transaction ERROR: ' + error.message);
		// 		}, function() {
		// 			console.log('Entry inserted');
		// 			// app.router.refreshPage();
		// 			if (commit_entry) {
		// 				commitEntry(entry.entry_id);
		// 			}					
		// 		});
		// 	} else {
		// 		app.toast.show({
		// 			text: 'This record already exists',
		// 			closeTimeout: 3000
		// 		});
		// 	}
		// }, function(tx2, error) {
		// 	// console.log('SELECT error: ' + error.message);
		// 	alert('Insert Entry: SELECT error: ' + error.message);
		// });
	});
}


function updateEntry(data, commit_entry = false, notify = true) {
// function updateEntry(data, entry_type = 'baseline', commit_entry = false, notify = true) {
	// let executeQuery = undefined;
	// let fields = undefined;
	// let entry = entry_type == 'baseline' ? data.json_entry_data : data.json_entry_followup_data;
	// if (entry_type === 'baseline') {
	// 	executeQuery = 'UPDATE entry SET entry_title = ?, entry_subtitle = ?, json_entry_data = ?, date_modified = ? WHERE entry_id = ?;'
	// 	fields = [data.entry_title, data.entry_subtitle, entry, data.date_modified, data.entry_id];
	// } else if (entry_type === 'followup') {
	// 	executeQuery = 'UPDATE entry SET entry_title = ?, entry_subtitle = ?, json_entry_followup_data = ?, status = ?, date_modified = ? WHERE entry_id = ?;'
	// 	fields = [data.entry_title, data.entry_subtitle, entry, data.status, data.date_modified, data.entry_id];
	// }

	let executeQuery = 'UPDATE entry SET title = ?, subtitle = ?, responses = ?, status = ?, created_at = ? WHERE entry_id = ?;'
	let fields = [data.title, data.subtitle, data.responses, data.status, data.created_at, data.entry_id];
	db.transaction(function(tx) {
		tx.executeSql(executeQuery, fields);
	}, function(error) {
		console.log('Transaction ERROR: ' + error.message);
	}, function() {
		console.log('Updated database OK');
		if (notify) {
			app.toast.show({text: 'Entry Changes Saved', closeTimeout: 3000});
		}
		if (commit_entry) {
			commitEntry(data.entry_id, entry_type);
		}
	});
}


function updateEntryStatus(entry_id, status) {
	let executeQuery = 'UPDATE entry SET status = ? WHERE entry_id = ?;'
	let fields = [status, entry_id];
	db.transaction(function(tx) {
		tx.executeSql(executeQuery, fields);
	}, function(error) {
		console.log('Transaction ERROR: ' + error.message);
	}, function() {
		console.log('Updated database OK');
	});
}


// function commitEntry(entry_id, entry_type = 'baseline') {
function commitEntry(entry_id) {
	let executeQuery = 'SELECT * FROM entry WHERE entry_id = ?';
	let fields = [entry_id];
	db.transaction(function(transaction) {
		transaction.executeSql(executeQuery, fields, 
			function(tx, result) {
				let entry = result.rows.item(0);
				console.log(entry);

				let form_data = {
					// entry_form_id: entry.entry_id,
					response_id: entry.entry_id,
					form_id: entry.form_id,
					title: entry.entry_title,
					sub_title: entry.entry_subtitle,
					responses: entry.responses,
					created_at: entry.created_at
				}

				let responses = JSON.parse(entry.responses);

				// if (responses.entity_type == 'baseline') {
				// 	form_data.creator_id = app_user.user_id;
				// } else if (entry_type == 'followup') {
				// 	form_data.fu_user_id = app_user.user_id;
				// }

				let form_post_url = undefined;
				if (responses.entity_type == 'baseline') {
					// form_post_url = base_url+'commit-form';
					form_post_url = base_url + 'entry/add';
				} else if (responses.entity_type == 'followup') {
					// form_post_url = base_url+'commit-followup-form';
					form_post_url = base_url + 'entry/add-followup';
				}
				console.log(form_data);

				app.request.post(form_post_url, form_data, function (result) {
					console.log(result);
					let json_obj = JSON.parse(result);
					if (json_obj.status == 201) {
						// Clean photo and convert file to base64
						// let entry_data = undefined;
						// if (responses.entity_type == 'baseline') {
						// 	entry_data = JSON.parse(entry.json_entry_data);
						// } else if (responses.entity_type == 'followup') {
						// 	entry_data = JSON.parse(entry.json_entry_followup_data);
						// }

						// let data = {};
						if (responses.photo != undefined) {
							console.log('photo conversion');
							// let photo_src = responses.entity_type == 'baseline' ? 'json_response' : 'json_followup';
							commitFile(responses.photo, app_user.user_id, entry.entry_id);
						}

						console.log('Succesfully commited');
						app.toast.show({text: 'Entry has been committed', closeTimeout: 3000});
						// Update from entry status
						if (responses.entity_type == 'baseline') {
							updateEntryStatus(entry.entry_id, 1100);
						} else if (responses.entity_type == 'followup') {
							updateEntryStatus(entry.entry_id, 1111);
						}
						
					} else {

						if (json_obj.message == 'Entry already exists') {
							// Update from entry status
							if (responses.entity_type == 'baseline') {
								updateEntryStatus(entry.entry_id, 1100);
							} else if (responses.entity_type == 'followup') {
								updateEntryStatus(entry.entry_id, 1111);
							}
						} else {
							alert(json_obj.message);
							app.toast.show({text: json_obj.message, closeTimeout: 3000});
						}
						
					}
					
				}, function (error) {
					alert('Commit was unsuccessful');
				});
			},
			function (tx, error) {
				app.dialog.alert('Commit Entry: SQL query ERROR: ' + error.message);
			}
		);
	});
}



// function commitEntryBatch(entry_ids, entry_type = 'baseline') {
function commitEntryBatch(entry_ids) {
	let place_holder = '';
	for (var i = 0; i < entry_ids.length; i++) {
		place_holder = place_holder + '?,';
	}
	let new_place_holder = place_holder.substring(0, place_holder.length - 1);
	
	// Post array to remote server with photofiles
	let executeQuery = 'SELECT * FROM entry WHERE entry_id IN ('+new_place_holder+');';
	let fields = entry_ids;
	// console.log(executeQuery);
	// console.log(entry_ids);
	db.transaction(function(transaction) {
		transaction.executeSql(executeQuery, fields, 
			function(tx, result) {
				// let form_data_batch = [];
				for (var i = 0; i < result.rows.length; i++) {

					let entry = result.rows.item(i);
					console.log(entry);

					let form_data = {
						response_id: entry.entry_id,
						form_id: entry.form_id,
						title: entry.entry_title,
						sub_title: entry.entry_subtitle,
						responses: entry.responses,
						created_at: entry.created_at
					}

					let responses = JSON.parse(entry.responses);
					let form_post_url = undefined;
					if (responses.entity_type == 'baseline') {
						form_post_url = base_url + 'entry/add';
					} else if (responses.entity_type == 'followup') {
						form_post_url = base_url + 'entry/add-followup';
					}
					console.log(form_data);

					app.request.post(form_post_url, form_data, function (result) {
						console.log(result);
						let json_obj = JSON.parse(result);
						if (json_obj.status == 201) {
							if (responses.photo != undefined) {
								console.log('photo conversion');
								commitFile(responses.photo, app_user.user_id, entry.entry_id);
							}

							console.log('Succesfully commited');
							app.toast.show({ text: 'Entry has been committed', closeTimeout: 3000 });
							// Update from entry status
							if (responses.entity_type == 'baseline') {
								updateEntryStatus(entry.entry_id, 1100);
							} else if (responses.entity_type == 'followup') {
								updateEntryStatus(entry.entry_id, 1111);
							}

						} else {

							if (json_obj.message == 'Entry already exists') {
								// Update from entry status
								if (responses.entity_type == 'baseline') {
									updateEntryStatus(entry.entry_id, 1100);
								} else if (responses.entity_type == 'followup') {
									updateEntryStatus(entry.entry_id, 1111);
								}
							} else {
								alert(json_obj.message);
								app.toast.show({ text: json_obj.message, closeTimeout: 3000 });
							}

						}

					}, function (error) {
						alert('Commit was unsuccessful');
					});





					// let form_data = {
					// 	form_id: entry.form_id,
					// 	entry_form_id: entry.entry_id,
					// 	title: entry.entry_title,
					// 	sub_title: entry.entry_subtitle,
					// 	json_response: entry.json_entry_data,
					// 	json_followup: entry.json_entry_followup_data
					// }

					// if (entry_type == 'baseline') {
					// 	form_data.creator_id = app_user.user_id;
					// } else if (entry_type == 'followup') {
					// 	form_data.fu_user_id = app_user.user_id;
					// }
					// console.log(form_data);

					// let form_post_url = undefined;
					// if (entry_type == 'baseline') {
					// 	form_post_url = base_url+'commit-form';
					// } else if (entry_type == 'followup') {
					// 	form_post_url = base_url+'commit-followup-form';
					// }

					// app.request.post(form_post_url, form_data, function (result) {
					// 	console.log(result);
					// 	let json_obj = JSON.parse(result);
					// 	if (json_obj.status) {
					// 		// Clean photo and convert file to base64
					// 		let entry_data = undefined;
					// 		if (entry_type == 'baseline') {
					// 			entry_data = JSON.parse(entry.json_entry_data);
					// 		} else if (entry_type == 'followup') {
					// 			entry_data = JSON.parse(entry.json_entry_followup_data);
					// 		}

					// 		let data = {};
					// 		if (entry_data.photo != undefined) {
					// 			console.log('photo conversion');
					// 			let photo_src = entry_type == 'baseline' ? 'json_response' : 'json_followup';
					// 			commitFile(entry_data.photo, app_user.user_id, entry.entry_id, photo_src);
					// 		}

					// 		console.log('Succesfully commited');
					// 		// Update from entry status
					// 		if (entry_type == 'baseline') {
					// 			updateEntryStatus(entry.entry_id, 1100);
					// 		} else if (entry_type == 'followup') {
					// 			updateEntryStatus(entry.entry_id, 1111);
					// 		}

					// 	} else {
					// 		if (json_obj.message == 'Entry already exists') {
					// 			// Update from entry status
					// 			if (entry_type == 'baseline') {
					// 				updateEntryStatus(entry.entry_id, 1100);
					// 			} else if (entry_type == 'followup') {
					// 				updateEntryStatus(entry.entry_id, 1111);
					// 			}
					// 		} else {
					// 			alert(json_obj.message);
					// 			app.toast.show({text: json_obj.message, closeTimeout: 3000});
					// 		}
					// 	}
						
					// }, function (error) {
					// 	alert('Commit was unsuccessful');
					// });

				}
				let singulator = entry_ids.length === 1 ? 'Entry' : 'Entries';
				app.toast.show({text: entry_ids.length+' '+singulator+' Succesfully Commited', closeTimeout: 3000, closeButton: true});
				checkboxToggleBack();
			},
			function (tx, error) {
				app.dialog.alert('SQL query ERROR: ' + error.message);
			}
		);
	});
}








function commitFile(fileUri, creator_id, entry_id) {
	console.log(fileUri);
    window.resolveLocalFileSystemURL(fileUri, function(fileEntry) {
      	// orig func starts here
	    fileEntry.file(function (file) {
	        var reader = new FileReader();
	        reader.readAsDataURL(file);
	        reader.onloadend = function() {
				// let file_post_url = base_url+'commit-base64-file';	
				let file_post_url = base_url+'entry/add-photo';	
				let filename = fileUri.replace(/^.*[\\\/]/, '');
				let form_data = {filename: filename, creator_id: creator_id, response_id: entry_id, photo_base64: this.result};
				console.log(form_data);
				app.request.post(file_post_url, form_data, function (result) {
					console.log(result);
				}, function (error) {
					alert('Commit was unsuccessful');
				});
	        };
	    }, function(error){
	    	console.log(error);
	    });
      	// orig func ends here
	},
	function(error){
		console.log(error);
	});   
}




function purgeEntry(entry_id) {
	db.transaction(function(tx) {
		tx.executeSql('DELETE FROM entry WHERE entry_id = ?', [entry_id]);
	}, function(error) {
		console.log('Transaction ERROR: ' + error.message);
		app.dialog.alert('Transaction ERROR: ' + error.message);
	}, function() {
		console.log('Updated database OK');
		app.toast.show({text: 'Entry has been deleted', closeTimeout: 3000, closeButton: true});
		mainView.router.back({force:true});		
	});
}


function purgeEntries(entry_ids) {
	let place_holder = '';
	for (var i = 0; i < entry_ids.length; i++) {
		place_holder = place_holder + '?,';
	}
	let placeholder = place_holder.substring(0, place_holder.length - 1); // Remove last character from string
	let executeQuery = 'DELETE FROM entry WHERE entry_id IN ('+placeholder+');'; // DELETE FROM form_entry WHERE rowid IN (1, 2);
	let fields = entry_ids;
	db.transaction(function(tx) {
		tx.executeSql(executeQuery, fields);
	}, function(error) {
		console.log('Transaction ERROR: ' + error.message);
		app.dialog.alert('Transaction ERROR: ' + error.message);
	}, function() {
		$$('input[name="entry_id"]:checked').parents('.item-content').remove();
		app.toast.show({text: 'Entries have been deleted', closeTimeout: 3000, closeButton: true});
		checkboxToggleBack();
	});
}




function checkboxToggleBack() {
	let selected = $$('input[type="checkbox"]:checked');
	if (selected.length == 0) {
		// Hide delete and send buttons
		$$('label.item-checkbox').hide();
		$$('.longpress-options').hide();
		// Display search button
		$$('.default-options').show();
		$$('.title.page-title').show();
		$$('.title.counter-title').html('').hide();
	} else {
		$$('.title.page-title').hide();
		$$('.title.counter-title').show().html(selected.length+' Selected');
	}
}













// Files Functions
function moveFile(fileUri) {
	window.resolveLocalFileSystemURL(fileUri, function(fileEntry) {
		// console.log(fileEntry);
		newFileUri  = cordova.file.externalDataDirectory;
		newFileName = fileEntry.name;
		window.resolveLocalFileSystemURL(newFileUri, function(dirEntry) {
				// move the file to a new directory and rename it
				fileEntry.moveTo(dirEntry, newFileName, function(success) {
					console.log(success);
				}, function(error) {
					console.log(error);
				});
			},
			function(error) {
				console.log(error);
			});
	},
	function(error){
		console.log(error);
	});
}

// function readFile(data, fileUri) {
function readFile(data) {
	let fileUri = data.photo;
	console.log(fileUri);
	window.resolveLocalFileSystemURL(fileUri, function(fileEntry) {
		fileEntry.file(function (file) {
			var reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onloadend = function() {
				// console.log(this.result);
				data.photo_base64 = this.result;
			};
		},
		function(error){
			console.log(error);
		});
	},
	function(error){
		console.log(error);
	});
}


function checkFile(data) {
	let fileUri = data.photo;
	console.log(fileUri);
	window.resolveLocalFileSystemURL(fileUri, function(fileEntry) {
		fileEntry.file(function (file) {
			var reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onloadend = function() {
				console.log(this.result);
				// data.photo_base64 = this.result;

				if(this.result == null) {
				   // If you receive a null value the file doesn't exists
				   data.photo_base64 = 'http://116.203.142.9/aws-api-bak/uploads'+data.photo_file;
				} else {
				    // Otherwise the file exists
				   data.photo_base64 = this.result;
				}
				console.log(data.photo_base64);
			};
		},
		function(error){
			console.log(error);
		});
	},
	function(error){
		console.log(error);
	});
}


function js_yyyy_mm_dd_hh_mm_ss() {
	now = new Date();
	year = "" + now.getFullYear();
	month = "" + (now.getMonth() + 1); if (month.length == 1) { month = "0" + month; }
	day = "" + now.getDate(); if (day.length == 1) { day = "0" + day; }
	hour = "" + now.getHours(); if (hour.length == 1) { hour = "0" + hour; }
	minute = "" + now.getMinutes(); if (minute.length == 1) { minute = "0" + minute; }
	second = "" + now.getSeconds(); if (second.length == 1) { second = "0" + second; }
	return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
}




function title_maker(form, formData) {
	form = detoxForm(form);
	// console.log(form);
	// console.log(formData);

	// let entry_title = JSON.parse(form.entry_title);
	// let entry_subtitle = JSON.parse(form.entry_subtitle);

	let entry_title = form.entry_title;
	let entry_subtitle = form.entry_subtitle;

	let data = {};
	//  Create entry title
	data.title = '';
	for (var i = 0; i < entry_title.length; i++) {
		let key = 'qn' + entry_title[i];
		data.title += formData[key] + ' ';
	}

	//  Create entry sub title
	data.subtitle = '';
	for (var i = 0; i < entry_subtitle.length; i++) {
		let key = 'qn' + entry_subtitle[i];
		data.subtitle += formData[key] + ' ';
	}

	data.title = data.title.slice(0, -1);
	data.subtitle = data.subtitle.slice(0, -1);

	return data;
}

function detoxForm(form) {
	form.conditional_logic = JSON.parse(form.conditional_logic);
	form.entry_subtitle = JSON.parse(form.entry_subtitle);
	form.entry_title = JSON.parse(form.entry_title);
	form.followup_prefill = JSON.parse(form.followup_prefill);
	form.question_list = JSON.parse(form.question_list);
	return form;
}

function migrateEntries() {
	let executeQuery = 'SELECT * FROM entry_old;';
	let fields = [];
	db.transaction(function (transaction) {
		transaction.executeSql(executeQuery, fields,
			function (tx, result) {
				for (var i = 0; i < result.rows.length; i++) {
					let old_entry = result.rows.item(i);

					let entry = {};

					if (old_entry.status == 1000 || old_entry.status == 1100) {
						let responses = JSON.parse(old_entry.json_entry_data);
						responses.entity_type = 'baseline'
						entry.responses = JSON.stringify(responses);
					} else {
						let responses = JSON.parse(old_entry.json_entry_followup_data);
						responses.entity_type = 'followup'
						entry.responses = JSON.stringify(responses);
					}

					entry.entry_id = old_entry.entry_id;
					entry.form_id = old_entry.form_id;
					entry.title = old_entry.entry_title;
					entry.subtitle = old_entry.entry_subtitle;
					entry.status = old_entry.status;
					entry.created_at = old_entry.date_created;				

					db.transaction(function (tx3) {
						tx3.executeSql('INSERT INTO entry (entry_id, form_id, title, subtitle, responses, status, created_at) VALUES (?,?,?,?,?,?,?);', [entry.entry_id, entry.form_id, entry.title, entry.subtitle, entry.responses, entry.status, entry.created_at]);
					}, function (error) {
						console.log('Transaction ERROR: ' + error.message);
					}, function () {
						console.log('Entry Inserted');
						// Commit is flagged for commiting
						if (commit_entry) {
							commitEntry(entry.entry_id);
						}
					});

				}
			},
			function (tx, error) {
				app.dialog.alert('SQL query ERROR: ' + error.message);
			}
		);
	});
}





// function checkFile(file) {
// 	let data = {};
// 	var reader = new FileReader();
// 	var fileSource = cordova.file.externalDataDirectory+file;
// 	reader.onloadend = function(evt) {
// 		if(evt.target.result == null) {
// 		   // If you receive a null value the file doesn't exists
// 		   data.photo = 'http://116.203.142.9/aws-api-bak/uploads'+file;
// 		} else {
// 		    // Otherwise the file exists
// 		   data.photo = cordova.file.externalDataDirectory+file;
// 		}    
// 		console.log(data);     
// 	};
// 	// We are going to check if the file exists
// 	reader.readAsDataURL(fileSource);
// }


// entry_id
// form_id
// entry_title
// entry_subtitle
// json_entry_data
// json_entry_followup_data
// status
// is_creator
// date_created
// date_modified