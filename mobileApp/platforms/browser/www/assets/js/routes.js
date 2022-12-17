// App Vars
var db = undefined;
var app_user = undefined;
var entry_prefix = undefined;
var conditional_logic = undefined;

var autoselect = true;

// Remote server connection paths
// var base_url = 'http://116.203.142.9/aws-api-bak/index.php/app/';
// var base_url = 'https://dashboard.africawatersolutions.org/api/index.php/app/';
var base_url = 'https://dashboard.africawatersolutions.org/aws.api/public/'; // New Remote APIs
//var base_url = 'http://localhost/AWSPROJECT/api/public/'; // New Remote APIs

// var base_url = 'http://192.168.1.107/aws/api/public/'; // Home Network
// var base_url = 'http://10.163.171.155/aws.api/public/'; // Broadband Network
// var base_url = 'http://192.168.249.29/aws/api/public/'; // OnePlus Mobile Hotspot

var app = new Framework7({
	root: '#app',
	name: 'Survey King - AWS',
	id: 'com.aws.app',
	touch: {
		tapHold: true //enable tap hold events
	},
	toast: {
		closeTimeout: 3000,
		closeButton: true,
		closeButtonColor: 'red'
	},
	routes: [
		{
			name: '/',
			path: '/',
			templateUrl: './index.html',
		},
		{
			name: 'slide',
			path: '/slide/',
			templateUrl: './pages/slide.html',
		},
		{
			name: 'sign-in',
			path: '/sign-in/',
			templateUrl: './pages/sign-in.html',
		},
		{
			name: 'home',
			path: '/home/',
			async: function (routeTo, routeFrom, resolve, reject) {
				let executeQuery = 'SELECT form_id, is_followup, title, created_at FROM form;';
				let fields = [];
				db.transaction(function(transaction) {
					transaction.executeSql(executeQuery, fields, 
						function(tx, result) {
							if (result.rows.length === 0) {
								app.router.refreshPage();
								//downloadForms();
								//mainView.router.navigate('/home/');
							} else {
								let data = {};
								let forms = [];
								for (var i = 0; i < result.rows.length; i++) {
									// Set dynamic paths
									if (result.rows.item(i).is_followup == 1) { //baseline_followup
										result.rows.item(i).path = '/entry-groups/?form_id='+result.rows.item(i).form_id;
									} else if (result.rows.item(i).is_followup == 0) { // single entry
										result.rows.item(i).path = '/entries/?form_id='+result.rows.item(i).form_id+'&group=all';
									}
									forms.push(result.rows.item(i));
								}
								data.forms = forms;
								resolve(
									
									{templateUrl: './pages/home.html'}, // list of forms
									{context: data}
								
								);
								
							}
						},
						function (tx, error) {
							app.dialog.alert('SQL query ERROR: ' + error.message);
						}
					);
				});
			},
			on: {
				pageInit: function (e, page) {
					app.searchbar.create({
						el: '.searchbar-forms',
						searchContainer: '.list',
						searchIn: '.item-title'
					});
				},
			}
		},
		{
			name: 'entry-groups',
			path: '/entry-groups/',
			async: function (routeTo, routeFrom, resolve, reject) {
				let executeQuery = 'SELECT form_id, title FROM form WHERE form_id = ?;';
				let fields = [routeTo.query.form_id];
				db.transaction(function(transaction) {
					transaction.executeSql(executeQuery, fields, 
						function(tx, result) {
							let data = {};
							let form = result.rows.item(0);
							data.form_id = form.form_id;
							data.title = form.title;
							resolve(
								{templateUrl: './pages/entry-groups.html'},
								{context: data}
							);
						},
						function (tx, error) {
							app.dialog.alert('SQL query ERROR: ' + error.message);
						}
					);
				});
			}
		},
		{
			name: 'entries',
			path: '/entries/',
			async: function (routeTo, routeFrom, resolve, reject) {
				let executeQuery = undefined;
				let fields = undefined;
				let data = {};
				let group = routeTo.query.group;
				data.form_id = routeTo.query.form_id;
				data.group = group;
				if (group == 'all') {
					data.title = 'Entries';
					data.fab = 'add_entries';
					executeQuery = 'SELECT entry_id, title, subtitle, status FROM entry WHERE form_id = ? ORDER BY created_at ASC;';
					fields = [data.form_id];
				} else if (group == 'baseline') {
					data.title = 'Baseline';
					data.fab = 'add_entries';
					// executeQuery = 'SELECT entry_id, title, subtitle, status FROM entry WHERE form_id = ? AND (status = ? OR status = ?) AND is_creator = ?;';
					// fields = [data.form_id, 1000, 1100, 1];
					executeQuery = 'SELECT entry_id, title, subtitle, status FROM entry WHERE form_id = ? AND (status = ? OR status = ?) ORDER BY created_at ASC;';
					fields = [data.form_id, 1000, 1100];
				} else if (group == 'followup') {
					data.title = 'Follow-up';
					data.fab = 'download_entries';
					executeQuery = 'SELECT entry_id, title, subtitle, status FROM entry WHERE form_id = ? AND (status = ? OR status = ? OR status = ?) ORDER BY created_at ASC;';
					fields = [data.form_id, 1100, 1110, 1111];
				}

				db.transaction(function(transaction) {
					transaction.executeSql(executeQuery, fields, 
						function(tx, result) {
							let entries_drafts = [];
							let entries_committed = [];

							let entries_fu_new = [];
							let entries_fu_drafts = [];
							let entries_fu_committed = [];

							for (var i = 0; i < result.rows.length; i++) {
								let c_entry = result.rows.item(i);

								// basline draft and commit
								if (group == 'all' || group == 'baseline') {
									if (c_entry.status == 1000) {
										entries_drafts.push(c_entry);
									} else if (c_entry.status == 1100) {
										entries_committed.push(c_entry);
									}
								}

								// followup draft and commit
								if (group == 'followup') {
									if (c_entry.status == 1100) {
										entries_fu_new.push(c_entry);
									} else if (c_entry.status == 1110) {
										entries_fu_drafts.push(c_entry);
									} else if (c_entry.status == 1111) {
										entries_fu_committed.push(c_entry);
									}
								}
							}
							resolve(
								{templateUrl: './pages/entries.html'},
								{context: data}
							);

							$$(document).on('page:init', '.page[data-name="entries"]', function (e) {

								if (group == 'followup') {

									var virtualList1 = app.virtualList.create({
										el: '.virtual-list-new',
										items: entries_fu_new,
										itemTemplate: $$('#temp-entry-followup-list-item').html(),
										searchAll: function (query, items) {
											var found = [];
											for (var i = 0; i < items.length; i++) {
												let text = items[i].title+' '+items[i].subtitle;
												if (text.toLowerCase().indexOf(query.toLowerCase()) >= 0 || query.trim() === '') found.push(i);
											}
											return found; //return array with mathced indexes
										},
									});
									var virtualList2 = app.virtualList.create({
										el: '.virtual-list-drafted',
										items: entries_fu_drafts,
										itemTemplate: $$('#temp-entry-list-item-avec-checkbox').html(),
										searchAll: function (query, items) {
											var found = [];
											for (var i = 0; i < items.length; i++) {
												let text = items[i].title+' '+items[i].subtitle;
												if (text.toLowerCase().indexOf(query.toLowerCase()) >= 0 || query.trim() === '') found.push(i);
											}
											return found; //return array with mathced indexes
										},
									});
									$$('label.item-checkbox').hide();
									var virtualList3 = app.virtualList.create({
										el: '.virtual-list-committed',
										items: entries_fu_committed,
										itemTemplate: $$('#temp-entry-list-item').html(),
										searchAll: function (query, items) {
											var found = [];
											for (var i = 0; i < items.length; i++) {
												let text = items[i].title+' '+items[i].subtitle;
												if (text.toLowerCase().indexOf(query.toLowerCase()) >= 0 || query.trim() === '') found.push(i);
											}
											return found; //return array with mathced indexes
										},
									});
								} else if (group == 'all' || group == 'baseline') {
									var virtualList2 = app.virtualList.create({
										el: '.virtual-list-drafted',
										items: entries_drafts,
										itemTemplate: $$('#temp-entry-list-item-avec-checkbox').html(),
										searchAll: function (query, items) {
											var found = [];
											for (var i = 0; i < items.length; i++) {
												let text = items[i].title+' '+items[i].subtitle;
												if (text.toLowerCase().indexOf(query.toLowerCase()) >= 0 || query.trim() === '') found.push(i);
											}
											return found; //return array with mathced indexes
										},
									});
									$$('label.item-checkbox').hide();
									var virtualList3 = app.virtualList.create({
										el: '.virtual-list-committed',
										items: entries_committed,
										itemTemplate: $$('#temp-entry-list-item').html(),
										searchAll: function (query, items) {
											var found = [];
											for (var i = 0; i < items.length; i++) {
												let text = items[i].title+' '+items[i].subtitle;
												if (text.toLowerCase().indexOf(query.toLowerCase()) >= 0 || query.trim() === '') found.push(i);
											}
											return found; //return array with mathced indexes
										},
									});
								}

							});
						},
						function (tx, error) {
							console.log(error);
							app.dialog.alert('List Entries: SQL query ERROR: ' + error.message);
						}
					);
				});
			},
			on: {
				pageInit: function (e, page) {

					// setTimeout( function() {

						// var element = '.searchbar-entries';

						// $$('.virtual-list-new').hide();
						// $$('.virtual-list-drafted').hide();
						// $$('.virtual-list-committed').hide();




						// var searchbar = app.searchbar.create({
						// 	el: element,
						// 	searchContainer: '.tab-active',
						// 	searchIn: '.item-title',
						// });

						$$('.tab').on('tab:show', function(e) {
							// let target = '#'+$$(this).find('.list').attr('id');
							// console.log(target);



							// // console.log('tab changed');
							
							// if ($$(element).hasClass('searchbar-enabled')) {
							// 	app.searchbar.clear(element);
							// 	app.searchbar.disable(element);
							// 	app.searchbar.destroy(element);
							// }

							// var searchbar = app.searchbar.create({
							// 	el: element,
							// 	// searchContainer: '.tab-active',
							// 	searchContainer: target,
							// 	searchIn: '.item-title'
							// });
						});

						$$('.title.page-title').show();
						$$('.title.counter-title').hide();

						$$('.longpress-options').hide();
						$$('.default-options').show();
						$$('label.item-checkbox').hide();



					// }, 1000);



				}
			}
		},
		{
			name: 'entry',
			path: '/entry/',
			async: function (routeTo, routeFrom, resolve, reject) {
				if (routeTo.query.action == 'add') {
					let executeQuery = 'SELECT form_id, question_list, conditional_logic, is_geotagged, is_photograph FROM form WHERE form_id = ?;';
					let fields = [routeTo.query.form_id];
					db.transaction(function(transaction) {
						transaction.executeSql(executeQuery, fields, 
							function(tx, result) {
								let data = {};
								let form = result.rows.item(0);
								data.form_id = form.form_id;
								data.questions = JSON.parse(form.question_list);
								data.count = data.questions.length;
								data.is_geotagged = form.is_geotagged;
								data.is_photograph = form.is_photograph;
								conditional_logic = JSON.parse(form.conditional_logic) ?? undefined;
								console.log(data);
								resolve(
									{templateUrl: './pages/entry-add.html'}, // list of forms
									{context: data}
								);
							},
							function (tx, error) {
								app.dialog.alert('SQL query ERROR: ' + error.message);
							}
						);
					});
				} else if (routeTo.query.action == 'add-followup') {

					let executeQuery = 'SELECT * FROM entry WHERE entry_id = ?;';
					let fields = [routeTo.query.id];
					db.transaction(function(transaction) {
						transaction.executeSql(executeQuery, fields, 
							function(tx, result) {
								let entryData = result.rows.item(0);
								console.log("the selectec entry is",entryData);

								let executeQuery = 'SELECT form_id, question_list, conditional_logic, followup_prefill, is_geotagged, is_photograph FROM form WHERE form_id = ?;';
								let fields = [entryData.form_id];

								db.transaction(function(transaction) {
									transaction.executeSql(executeQuery, fields, 
										function(tx, result) {

											let data = {};
											let form = result.rows.item(0);
											data.form_id = form.form_id;
											data.questions = JSON.parse(form.question_list);
											data.count = data.questions.length;
											data.entry_id = entryData.entry_id;
											data.title = entryData.title;
											data.status = entryData.status;
											data.is_geotagged = form.is_geotagged;
											// data.is_photograph = form.is_photograph;

											conditional_logic = JSON.parse(form.conditional_logic);
											resolve(
												{templateUrl: './pages/entry-followup-add.html'}, // list of forms
												{context: data}
											);

											$$(document).on('page:init', '.page[data-name="entry-followup-add"]', function (e) {
												setTimeout( function() {
													autoselect = false;
													let entry = JSON.parse(entryData.responses);
													let followup_pref = JSON.parse(form.followup_prefill);
													let followup_prefill = JSON.parse(followup_pref)
													let prefill = {};
													for (var i = 0; i < followup_prefill.length; i++) {
														let key = 'qn'+followup_prefill[i];
														
														prefill[key] = entry[0][key];
													}
													console.log(prefill);
													app.form.fillFromData('#form-add-entry-followup', prefill);
													autoselect = true;
												}, 1000);
											});

										},
										function (tx, error) {
											app.dialog.alert('Get Form: SQL query ERROR: ' + error.message);
										}
									);
								});
							},
							function (tx, error) {
								app.dialog.alert('Get Entry: SQL query ERROR: ' + error.message);
							}
						);
					});

				} else if (routeTo.query.action == 'view') {
					let executeQuery = 'SELECT * FROM entry WHERE entry_id = ?;';
					let fields = [routeTo.query.id];
					db.transaction(function(transaction) {
						transaction.executeSql(executeQuery, fields, 
							function(tx, result) {
								let entryData = result.rows.item(0);
								console.log(entryData);

								let executeQuery = 'SELECT form_id, question_list, is_geotagged, is_photograph FROM form WHERE form_id = ?;';
								let fields = [entryData.form_id];
								db.transaction(function(transaction) {
									transaction.executeSql(executeQuery, fields, 
										function(tx, result) {
											let rs = result.rows.item(0);											
											let form = {};
											form.form_id = rs.form_id;
											form.questions = JSON.parse(rs.question_list);

											let data = {};
											data.count = form.questions.length;
											data.id = entryData.entry_id;
											data.title = entryData.title;
											data.is_geotagged = rs.is_geotagged;
											data.is_photograph = rs.is_photograph;
											 data.status = entryData.status;

											let entry_data = undefined;
											if (entryData.status == 1000) {
												data.questions = mapData(form, JSON.parse(entryData.responses));
												// if(mapData(form, JSON.parse(entryData.responses)) == undefined){
												// data.questions = mapData(form, JSON.parse(entryData.responses)[0]);
												// }
												// else data.questions = mapData(form, JSON.parse(entryData.responses));
              
												entry_data = JSON.parse(entryData.responses);
											} 
											else if(entryData.status == 1100){
												data.questions = mapData(form, JSON.parse(entryData.responses)[0]);
												entry_data = JSON.parse(entryData.responses);
											}
											else if(entryData.status == 1110 || entryData.status == 1111) {
												data.questions = mapData(form, JSON.parse(entryData.responses));
												entry_data = JSON.parse(entryData.responses);
											}
											if(entry_data.coordinates == undefined){
											 data.coordinates = entry_data[0].coordinates;
											}
											else data.coordinates = entry_data.coordinates;

											// data.photo = entry_data[0].photo;

											
											
											
											resolve(
												{templateUrl: './pages/entry-view.html'}, // list of forms
												{context: data}
											);
										},
										function (tx, error) {
											app.dialog.alert('Get Form: SQL query ERROR: ' + error.message);
										}
									);
								});
							},
							function (tx, error) {
								app.dialog.alert('Get Entry: SQL query ERROR: ' + error.message);
							}
						);
					});
				} else if (routeTo.query.action == 'edit') {
					
					let executeQuery = 'SELECT * FROM entry WHERE entry_id = ?;';
					let fields = [routeTo.query.id];
					db.transaction(function(transaction) {
						transaction.executeSql(executeQuery, fields, 
							function(tx, result) {
								let entryData = result.rows.item(0);

								let executeQuery = 'SELECT form_id, question_list, conditional_logic, is_geotagged, is_photograph FROM form WHERE form_id = ?;';
								let fields = [entryData.form_id];
								db.transaction(function(transaction) {
									transaction.executeSql(executeQuery, fields, 
										function(tx, result) {

											let data = {};
											let form = result.rows.item(0);
											data.form_id = form.form_id;
											data.questions = JSON.parse(form.question_list);
											data.count = data.questions.length;
											data.entry_id = entryData.entry_id;
											data.title = entryData.title;
											data.status = entryData.status;
											data.is_geotagged = form.is_geotagged;
											data.is_photograph = form.is_photograph;
											resolve(
												{templateUrl: './pages/entry-edit.html'}, // list of forms
												{context: data}
											);

											$$(document).on('page:init', '.page[data-name="entry-edit"]', function (e) {
												
												setTimeout( function() {
													// let entry = entryData.status == 1000 ? JSON.parse(entryData.json_entry_data) : JSON.parse(entryData.json_entry_followup_data);
													let entry = JSON.parse(entryData.responses);
													autoselect = false;
													let prefill = {};

													for (let [key, value] of Object.entries(entry[0])) {
														console.log(`${key}: ${value}`);
														prefill[key] = value;
													  }
													// 
													// for (var i = 0; i < followup_prefill.length; i++) {
													// 	let key = 'qn'+followup_prefill[i];
														
													// 	prefill[key] = entry[0][key];
													// }
													// console.log(prefill);
													// app.form.fillFromData('#form-add-entry-followup', prefill);
													// autoselect = true;
													app.form.fillFromData('#form-edit-entry', prefill);
													autoselect = true;
													// Show picture if photo is enabled for form
													// if (data.is_photograph == 1) {
													// 	$$('#capture-photo').attr('src', entry.photo);
													// }
												}, 1000);
											});

										},
										function (tx, error) {
											app.dialog.alert('Get Form: SQL query ERROR: ' + error.message);
										}
									);
								});
							},
							function (tx, error) {
								app.dialog.alert('Get Entry: SQL query ERROR: ' + error.message);
							}
						);
					});
				}
			}
		},








		{
			name: 'form-questions',
			path: '/form-questions/:form_id/',
			async: function (routeTo, routeFrom, resolve, reject) {
				let executeQuery = 'SELECT form_id, question_list, is_geotagged, is_photograph FROM form WHERE form_id = ?;';
				let fields = [routeTo.query.form_id];
				db.transaction(function(transaction) {
					transaction.executeSql(executeQuery, fields, 
						function(tx, result) {
							let data = {};
							let form = result.rows.item(0);
							data.form_id = form.form_id;
							data.questions = JSON.parse(form.question_list);
							data.count = data.questions.length;
							data.is_geotagged = form.is_geotagged;
							data.is_photograph = form.is_photograph;
							console.log(data);
							resolve(
								{templateUrl: './pages/form-questions.html'}, // list of forms
								{context: data}
							);
						},
						function (tx, error) {
							app.dialog.alert('SQL query ERROR: ' + error.message);
						}
					);
				});
			}
		},




		{
			name: 'settings',
			path: '/settings/',
			templateUrl: './pages/settings.html',
		}
	]
});

var $$ = Dom7;
var mainView = app.views.create('.view-main');


document.addEventListener('deviceready', function() {
	screen.orientation.lock('portrait-primary');
	db = window.sqlitePlugin.openDatabase({name: 'surveyking.db', location: 'default', androidDatabaseImplementation: 2});
	onDeviceReady();
	autoLogin();
});

// Back Navigation Handler
document.addEventListener('backbutton', function(e) {
	if (app.views.main.router.url == '/android_asset/www/index.html' || app.views.main.router.url == '/home/' || app.views.main.router.url == '/slide/' || app.views.main.router.url == '/sign-in/') {
		e.stopImmediatePropagation();
		navigator.app.exitApp();
	} else {
		mainView.router.back();
	}
	app.actions.close();
	app.popup.close();
}, true);


$$(document).on('taphold', '.longpress', function () {
	$$('label.item-checkbox').show();
	$$(this).parents('li').find('input').prop({checked: true});
	// Display delete and send buttons
	$$('.longpress-options').show();
	$$('.default-options').hide();
	checkboxToggleBack();
});