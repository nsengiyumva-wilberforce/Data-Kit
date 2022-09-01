$$(document).on('page:init', '.page', function(e) {
	// Sign out
	$$(document).on('click', '#sign-out', function(event) {
		event.stopImmediatePropagation();
		app.dialog.confirm('Login out will erase all uncommitted entries. Do you want to proceed?', 'Alert', function() {
			appLogout();
		});
	});

	// Restore Entries
	$$(document).on('click', '#restore-entries', function(event) {
		event.stopImmediatePropagation();
		// backSync(app_user.user_id);
		console.log('Backsync nolonger supported');
	});

	// Download Entries for Follow-up
	$$(document).on('click', '#download-followup-entries', function(event) {
		event.stopImmediatePropagation();
		let form_id = $$(this).attr('data-form-id');
		downloadRegionEntries(app_user.region_id, form_id);
	});


	$$(document).on('change', 'input[type="radio"], input[type="checkbox"]', function (event) {
		let qn = $$(this).attr('name');
		let answer = $$(this).val();

		if (conditional_logic != undefined && conditional_logic[qn] != undefined && conditional_logic[qn][answer] != undefined) {
			if (conditional_logic[qn][answer]['hide'] != undefined) {

				// // Hidden fields to be fixed in next release
				// let hidden = conditional_logic[qn][answer]['hide'];
				// for (var i in hidden) {
				// 	let elem = 'input[name="' + i + '"][value="' + prefills[i] + '"]';
				// 	$$(elem).attr('disabled', true);
				// 	$$('#card-'+i).style('display', 'none');
				// }
				
			} else if (conditional_logic[qn][answer]['prefill'] != undefined) {
				let prefills = conditional_logic[qn][answer]['prefill'];
				for (var i in prefills) {
					let elem = 'input[name="' + i + '"][value="' + prefills[i] + '"]';
					$$(elem).prop("checked", true);
				}
			}
		}
	});


});


$$(document).on('page:init', '.page[data-name="sign-in"]', function (e) {

	$$(document).on('click', 'input#show-password', function (e) {
		if ($$('#show-password').is(':checked')) {
			$$('#toggle-password').attr('type', 'text');
		} else {
			$$('#toggle-password').attr('type', 'password');
		}
		$$('#toggle-password').focus();
	});

	$$('#sign-in').on('click', function(e) {
		e.stopImmediatePropagation();
		app.progressbar.show();
		let form_data = app.form.convertToData('#form-sign-in');
		authenticate(form_data.email, form_data.password);	
	});

});


$$(document).on('page:init', '.page[data-name="home"]', function (e) {
	// Download forms
	$$(document).on('click', '#download-forms', function (e) {
		e.preventDefault();
		// e.stopPropagation();
		downloadForms();
		downloadProjects();
		downloadOrganisations();
		downloadAreas(app_user.user_id);
		// mainView.router.refreshPage();
	});
});


$$(document).on('page:init', '.page[data-name="entries"]', function (e) {

	$$(document).on('click', '.tabs input[type="checkbox"]', function (e) {
		checkboxToggleBack();
	});


	$$(document).on('click', '#bulk-commit', function (e) {
		e.preventDefault();
		// let group = $$(this).attr('data-group');
		// let entry_type = undefined;
		// if (group == 'all' || group == 'baseline') {
		// 	entry_type = 'baseline';
		// } else if (group == 'followup') {
		// 	entry_type = group;
		// }
		let selected  = $$('input[type="checkbox"]:checked').length;
		if (selected != 0) {
			if (selected <= 10) {
				app.dialog.confirm('Do you want to commit the selected entries?', 'Alert', function() {
					var entry_ids = [];
					$$('input[type="checkbox"]:checked').each(function() {
						entry_ids.push($$(this).val());
					});
					console.log(entry_ids);
					// commitEntryBatch(entry_ids, entry_type);
					commitEntryBatch(entry_ids);
				});
			} else {
				app.dialog.alert('You cannot commit more than 10 entries at once');
			}
		} else {
			$$('#error-msg').html('Invalid fields')
		}
	});



	$$(document).on('click', '#bulk-purge', function (e) {
		e.preventDefault();

		let selected  = $$('input[type="checkbox"]:checked').length;
		let singulator = selected === 1 ? 'entry' : 'entries';
		let help_text = 'You are about to delete '+selected+' '+singulator+'. Would you like to proceed?';

		app.dialog.confirm(help_text, 'Warning', 
			function(e) {
				var entry_ids = [];
				$$('input[type="checkbox"]:checked').each(function() {
					entry_ids.push($$(this).val());
				});
				console.log(entry_ids);
				purgeEntries(entry_ids);
			}
		);
	});

});





$$(document).on('page:init', '.page[data-name="entry-add"], .page[data-name="entry-edit"], .page[data-name="entry-followup-add"]', function (e) {

	$$('.app-list').each(function() {
		let db_table = $$(this).attr('data-db-table');
		// console.log(db_table);
		buildSelect(db_table);
	});
	
	$$('.app-list').on('change', function(e) {
		if (autoselect) {
			let db_table = $$(this).attr('data-db-table');
			let parent_id = this.options[this.selectedIndex].getAttribute('data-area-id');
			// console.log('select from '+db_table+' where parent_id is '+parent_id);
			buildChildSelect(db_table, parent_id);
		}
	});

	// Geotag an entry
	$$('#geotag-entry').on('click', function(event) {
		event.preventDefault();
		geoLocation();
	});

	// Photo an entry
	$$('#capture-photo').on('click', function(event) {
		event.preventDefault();
		photoPath();
	});
});



$$(document).on('page:init', '.page[data-name="entry-add"]', function (e) {
	let entry_prefix = 'AWS-'+app_user.region_code+'-U'+leadZeros(app_user.user_id, 4)+'-';
	console.log("whats the entry prefix", entry_prefix)


	let submit = true;
	$$(document).on('click', '#save-btn, #save-commit-btn', function(event) {

		// event.preventDefault();
		event.stopImmediatePropagation();
		if (submit) {
			submit = false;
			let form_id = $$(this).attr('data-form-id');
			let btn = $$(this).attr('id');
			let formData = app.form.convertToData('#form-add-entry');


			if (formData) {
				// Move photo to data directory and update file path
				// if (formData.photo != undefined) {
				// 	console.log(formData.photo);
				// 	moveFile(formData.photo);
				// 	formData.photo = formData.photo.replace(cordova.file.externalCacheDirectory, cordova.file.externalDataDirectory);
				// }

				formData.entity_type = 'baseline';
				formData.creator_id = app_user.user_id;
				formData.created_at = js_yyyy_mm_dd_hh_mm_ss();

				let timeStamp = new Date().getTime();
				entry = {};
				entry.entry_id = entry_prefix+timeStamp;
				entry.form_id = parseInt(form_id);
				// entry.responses = JSON.stringify(formData);
				entry.responses = formData;
				entry.status = 1000;
				entry.created_at = formData.created_at;
				entry.photo = 'file:///storage/emulated/0/Android/data/com.aws.app/files/1550492348464.jpg'


				// console.log(entry);

				// entry.entry_title = '';
				// entry.entry_subtitle = '';
				// entry.json_entry_data = JSON.stringify(formData);
				// entry.json_entry_followup_data = JSON.stringify([]);
				// entry.status = 1000;
				// entry.is_creator = 1;
				// entry.date_created = timeStamp;
				// entry.date_modified = timeStamp;
console.log("the etry daaaata",entry)
				saveEntry(entry, btn);
				// console.log(mainView.router.previousRoute.url);
				mainView.router.back(mainView.router.previousRoute.url, {ignoreCache: true, force:true, reloadPrevious: true});
				app.toast.show({
					text: 'Entry Saved',
					closeTimeout: 3000,
					closeButton: true
				});
				submit = true;

			} else {
				console.log('Incomplete Form');
				app.toast.show({
					text: 'Incomplete Form',
					closeTimeout: 3000,
					closeButton: true
				});
				submit = true;
			}

		}
	});
});




$$(document).on('page:init', '.page[data-name="entry-followup-add"]', function (e) {

	let submit = true;
	$$(document).on('click', '#save-followup-btn, #save-commit-followup-btn', function(event) {
		// event.preventDefault();
		event.stopImmediatePropagation();
		if (submit) {
			submit = false;
			let form_id = $$(this).attr('data-form-id');
			let entry_id = $$(this).attr('data-entry-id');
			let commit_entry = ($$(this).attr('id') == 'save-commit-followup-btn') ? true : false;
			let formData = app.form.convertToData('#form-add-entry-followup');
			let orig_photo = $$('#capture-photo').attr('src');

			if (checkEntryFields(formData)) {
				let executeQuery = 'SELECT entry_title, entry_subtitle FROM form WHERE form_id = ?;';
				let fields = [form_id];
				db.transaction(function(transaction) {
					transaction.executeSql(executeQuery, fields, 
						function(tx, result) {
							let form = result.rows.item(0);
							let titles = title_maker(form, formData);

							// let entry_title = JSON.parse(form.entry_title);
							// let entry_subtitle = JSON.parse(form.entry_subtitle);
							// let data = {};
							// //  Create entry title
							// data.entry_title = '';
							// for (var i = 0; i < entry_title.length; i++) {
							// 	let key = 'qn'+entry_title[i];
							// 	data.entry_title += formData[key]+' ';
							// }
							// //  Create entry sub title
							// data.entry_subtitle = '';
							// for (var i = 0; i < entry_subtitle.length; i++) {
							// 	let key = 'qn'+entry_subtitle[i];
							// 	data.entry_subtitle += formData[key]+' ';
							// }
							// // Remove empty space at the end of string
							// data.entry_title = data.entry_title.trim();
							// data.entry_subtitle = data.entry_subtitle.trim();


							// Move photo to data directory and update file path
							if (formData.photo != orig_photo) {
								moveFile(formData.photo);
								formData.photo = formData.photo.replace(cordova.file.externalCacheDirectory, cordova.file.externalDataDirectory);
							}

							formData.entity_type = 'followup';
							formData.creator_id = app_user.user_id;
							formData.created_at = js_yyyy_mm_dd_hh_mm_ss();

							let timeStamp = new Date().getTime();
							entry = {};
							entry.entry_id = entry_prefix + timeStamp;
							entry.form_id = form_id;
							entry.title = titles.title;
							entry.subtitle = titles.subtitle;
							// entry.responses = JSON.stringify(formData);
							entry.responses = formData;
							entry.status = 1110;
							entry.created_at = formData.created_at;








							// let timeStamp = new Date().getTime();
							// entry = {};
							// entry.entry_id = entry_id;
							// entry.entry_title = data.entry_title;
							// entry.entry_subtitle = data.entry_subtitle;
							// entry.json_entry_followup_data = JSON.stringify(formData);
							// entry.status = 1110;
							// entry.is_creator = 1;
							// entry.date_modified = timeStamp;
							updateEntry(entry, 'followup', commit_entry, true);
							mainView.router.back(mainView.router.previousRoute.url, {ignoreCache: true, force:true, reloadPrevious: true});
							app.toast.show({
								text: 'Entry Saved',
								closeTimeout: 3000,
								closeButton: true
							});
							submit = true;
						},
						function(error) {
							console.log(error);
							app.dialog.alert('SQL query ERROR: ' + error.message);
						}
					);
				});
			} else {
				console.log('Incomplete Form');
				app.toast.show({
					text: 'Incomplete Form',
					closeTimeout: 3000,
					closeButton: true
				});
				submit = true;
			}

		}
	});
});








$$(document).on('page:init', '.page[data-name="entry-edit"]', function (e) {

	let submit = true;
	$$(document).on('click', '#update-btn, #update-commit-btn', function(event) {
		// event.preventDefault();
		event.stopImmediatePropagation();
		if (submit) {
			submit = false;
			let form_id = $$(this).attr('data-form-id');
			let status = $$(this).attr('data-status');
			let commit_entry = ($$(this).attr('id') == 'update-commit-btn') ? true : false;
			let formData = app.form.convertToData('#form-edit-entry');
			let orig_photo = $$('#capture-photo').attr('src');

			// console.log(formData);

			if (checkEntryFields(formData)) {
				let executeQuery = 'SELECT entry_title, entry_subtitle FROM form WHERE form_id = ?;';
				let fields = [form_id];
				db.transaction(function(transaction) {
					transaction.executeSql(executeQuery, fields, 
						function(tx, result) {
							let form = result.rows.item(0);


							// let titles = title_maker(form, formData);

							// let entry_title = JSON.parse(form.entry_title);
							// let entry_subtitle = JSON.parse(form.entry_subtitle);
							// let data = {};
							// //  Create entry title
							// data.entry_title = '';
							// for (var i = 0; i < entry_title.length; i++) {
							// 	let key = 'qn'+entry_title[i];
							// 	data.entry_title += formData[key]+' ';
							// }
							// //  Create entry sub title
							// data.entry_subtitle = '';
							// for (var i = 0; i < entry_subtitle.length; i++) {
							// 	let key = 'qn'+entry_subtitle[i];
							// 	data.entry_subtitle += formData[key]+' ';
							// }
							// // Remove empty space at the end of string
							// data.entry_title = data.entry_title.trim();
							// data.entry_subtitle = data.entry_subtitle.trim();

							// Move photo to data directory and update file path
							if (formData.photo != orig_photo) {
								moveFile(formData.photo);
								formData.photo = formData.photo.replace(cordova.file.externalCacheDirectory, cordova.file.externalDataDirectory);
							}

							if (status == 1000) {
								formData.entity_type = 'baseline';
							} else if (status == 1110) {
								formData.entity_type = 'followup';
							}

							formData.creator_id = app_user.user_id;
							formData.created_at = js_yyyy_mm_dd_hh_mm_ss();

							let timeStamp = new Date().getTime();
							entry = {};
							// entry.entry_id = entry_prefix + timeStamp;
							entry.entry_id = formData.entry_id;
							entry.form_id = form_id;
							entry.title = titles.title;
							entry.subtitle = titles.subtitle;
							entry.responses = JSON.stringify(formData);
							// entry.responses = formData;
							entry.status = status;
							entry.created_at = formData.created_at;

							console.log(entry);


							// let timeStamp = new Date().getTime();
							// entry = {};
							// entry.entry_id = formData.entry_id;
							// entry.entry_title = data.entry_title;
							// entry.entry_subtitle = data.entry_subtitle;
							// // entry.json_entry_data = JSON.stringify(formData);
							// // entry.json_entry_followup_data = JSON.stringify([]);
							// // entry.status = 1000;
							// entry.status = status;
							// entry.is_creator = 1;
							// entry.date_modified = timeStamp;

							// let entity_type = undefined;
							// if (status == 1000) {
							// 	entity_type = 'baseline';
							// 	entry.json_entry_data = JSON.stringify(formData);
							// } else if (status == 1110) {
							// 	entity_type = 'followup';
							// 	entry.json_entry_followup_data = JSON.stringify(formData);
							// }
							// let entity_type = (status == 1000) ? 'baseline' : 'followup' ;
							updateEntry(entry, entity_type, commit_entry, true);

							mainView.router.back(mainView.router.previousRoute.url, {ignoreCache: true, force:true, reloadPrevious: true});
							app.toast.show({
								text: 'Entry Changes Saved',
								closeTimeout: 3000,
								closeButton: true
							});
							submit = true;
						},
						function(error) {
							console.log(error);
							app.dialog.alert('SQL query ERROR: ' + error.message);
						}
					);
				});
			} else {
				console.log('Incomplete Form');
				app.toast.show({
					text: 'Incomplete Form',
					closeTimeout: 3000,
					closeButton: true
				});
				submit = true;
			}

		}
	});

	// $$(document).on('click', '#update-commit-btn', function(event) {
	// 	event.preventDefault();
	// 	if (submit) {
	// 		submit = false;
	// 		// updateEntry(data, 'baseline', true);
	// 		submit = true;
	// 	}
	// });
});







$$(document).on('page:init', '.page[data-name="entry-view"]', function (e) {

	$$(document).on('click', '#purge-entry', function (e) {
		e.preventDefault();

		let entry_id = $$(this).attr('data-entry-id');
		let help_text = 'You are about to delete this entry. Would you like to proceed?';

		app.dialog.confirm(help_text, 'Warning', 
			function(e) {
				console.log(entry_id);
				purgeEntry(entry_id);
			}
		);
	});

	let submit = true;
	$$(document).on('click', '#commit-entry', function (event) {		
		event.stopImmediatePropagation();
		if (submit) {
			submit = false;
			let entry_id = $$(this).attr('data-entry-id');
			let entry_type = $$(this).attr('data-status') == 1000 ? 'baseline' : 'followup' ;
			commitEntry(entry_id, entry_type);
			submit = true;
		}

	});

});