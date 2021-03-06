$(() => {

	/**
	 * Shake animation
	 * @see https://jsfiddle.net/12aueufy/1/
	 */
	var shakingElements = [];

	const shake = function(element, magnitude = 16) {
  
		var tiltAngle = 1;
		var counter = 1;
		var numberOfShakes = 15;

		var startX = 0,
			startY = 0,
			startAngle = 0;

		var magnitudeUnit = 16 / numberOfShakes;

		var randomInt = (min, max) => {
			return Math.floor(Math.random() * (max - min + 1)) + min;
		};

		if(shakingElements.indexOf(element) === -1) {

			shakingElements.push(element);
			upAndDownShake();

		}

		function upAndDownShake() {

			if(counter < numberOfShakes) {
				element.css('transform', 'translate(' + startX + 'px, ' + startY + 'px)');

				magnitude -= magnitudeUnit;

				var randomX = randomInt(-magnitude, magnitude);
				var randomY = randomInt(-magnitude, magnitude);

				element.css('transform', 'translate(' + randomX + 'px, ' + randomY + 'px)');

				counter += 1;

				requestAnimationFrame(upAndDownShake);
			}

			if(counter >= numberOfShakes) {
				element.css('transform', 'translate(' + startX + ', ' + startY + ')');
				shakingElements.splice(shakingElements.indexOf(element), 1);
			}
		}

	};

	/**
	 * Update the user page and reload all files (get uploaded)
	 */
	const update = function(offset) {
		//Changing CSS if <> 6 files on page
		if(total - ((page-1)*filesPerPage+1) > 5)
			$('html, body').css('min-height', '100vh').css('height', 'auto');
		else
			$('html, body').css('min-height', 'none').css('height', '100%');

		$.get('/api/getUploads', {offset: offset}, (data) => {
			if(!data.success) {
				console.log(data.msg);
				alert(data.msg);
				return;
			}
			$('#uploads').empty();
			data.msg.forEach((f) => {
				let str = '<div id="'+f.filename+'" class="';

				str += (f.important == 1) ? 'file file-important">' : 'file">';

				if(f.mediatype.startsWith('image'))
					str += '<img class="fileImage" src="/'+f.filename+'" />';

				else if(f.mediatype.startsWith('video'))
					str += '<video class="fileVideo" src="/'+f.filename+'" controls></video>';

				else if(f.mediatype.startsWith('audio'))
					str += '<img class="fileAudio" src="/img/icon-audio.png" />';

				else str += '<img class="fileDefault" src="/img/icon-file.png" />';

				if(f.origin.length > 25)
					str += '<span clas="fileName">'+f.origin.substring(0, 22)+'...</span><div class="fileFooter"><span>';
				else
					str += '<span clas="fileName">'+f.origin+'</span><div class="fileFooter"><span>';

				str += '<a href="/'+f.filename+'" target="_blank">'+f.filename+'</a></span>';
				str += '<span> - </span><span><a href="#" class="get-infos-file">infos</a></span></div></div>';

				$('#uploads').append(str);
			});
		});
	};

	/**
	 * Upload + drag system
	 */
	const upload = function(f) {
		var apikey = $('#cookie').val();
		if(apikey === '')  {
			$('#upload-msg').text('Error : your apikey is empty.');
			return;
		}

		(f.name.length < 50) ? $('#upload-name').text(f.name) : $('#upload-name').text(f.name.substring(0, 47) + '...');

		var formData = new FormData();
		formData.append('file', f);
		formData.append('apikey', $('#cookie').val());

		$.ajax({
			url: '/api/upload',
			type: 'POST',
			enctype: 'multipart/form',
			data: formData,
			dataType: 'json',
			processData: false,
			contentType: false,
			cache: false,
			beforeSend: () => {
				$('#upload-bar').css('display', 'inline-block');
				$('#upload-bar div').css('width', '0%').text('0%').css('background-color', '#004600');
			},
			xhr: () => {
				var xhr = $.ajaxSettings.xhr();
				xhr.upload.onprogress = (e) => {
					if(e.lengthComputable) {
						let percent = Math.round((e.loaded/e.total)*1000)/10;
						$('#upload-bar div').css('width', percent+'%').text(percent+'%');
					}
				};
				return xhr;
			},
			error: (e) => {
				console.log(e.statusText);
				$('#upload-bar div').css('background-color', '#990000');
			},
			complete: (data) => {
				$('#upload-bar div').css('width', '100%').text('100%');
				if(data.responseJSON.success) {
					$('#upload-msg').html('<a href="'+data.responseJSON.url+'">'+data.responseJSON.msg+'</a>');
					//add one file
					total++;
					$('#total').text(total);
				} else $('#upload-msg').text(data.responseJSON.msg);

				//Update size used and files uploaded in infos
				$.get('/api/getInfos', (data) => {
					if(!data.success) {
						console.log(data.msg);
						alert(data.msg);
						return;
					}
					$('#size-used').text(data.msg.size);
					$('#files-uploaded').text(data.msg.files);
				});
			}
		});

		//Finally upload the page
		setTimeout(function() {
			update(page);
		}, 200);
	};

	/**
	 * Function for removing popup
	 */
	const removePopup = function(type = 'upload') {
		if(type == 'upload') {
			$('.info-upload').hide(250);
			$('header, div.inner.cover, footer').css('filter', '');
			$('#upload-name').empty();
			$('#upload-msg').empty();
			$('#upload-bar').css('display', 'none');
			$('#upload-bar div').css('background-color', '#004600');
		} else if(type == 'infos') {
			$('.infos-user').hide(250);
			$('header, div.inner.cover, footer').css('filter', '');
		} else if(type == 'file') {
			$('.infos-file').hide(250);
			$('header, div.inner.cover, footer').css('filter', '');
		}
	};

	//If user connected to the upload page
	if($('div.inner.cover').hasClass('logged')) {
		//Initialisation; global vars :
		//filesPerPage
		//page
		//total
		if(total == 0) {
			$('#start').text(0);
			$('#end').text(0);
			$('#total').text(0);
			$('#each').text(filesPerPage);
		} else if(total < filesPerPage) {
			$('#start').text(1);
			$('#end').text(total);
			$('#total').text(total);
			$('#each').text(filesPerPage);
		} else {
			$('#start').text(1);
			$('#end').text(filesPerPage);
			$('#total').text(total);
			$('#each').text(filesPerPage);
		}
		$('#act .pageInput').val(1);

		update(page);
	}

	/**
	 * shitposting
	 */
	$('.shake-error').on('mouseover', (e) => {
		shake($('.shake-error'), 10);
	});

	/**
	 * Register form
	 */
	$('#register').on('click', (e) => {
		if($('#name').val()===''||$('#email').val()===''||$('#pass').val()==='') {
			alert('Some fields are empty.');
			e.preventDefault();
		} else if($('#pass').val() !=$('#passc').val()) {
			alert('Passwords do not match.');
			e.preventDefault();
		} else $('#form').submit();
	});

	/**
	 * Login form
	 */
	$('#login').on('click', (e) => {
		if($('#name').val()===''||$('#pass').val()==='') {
			alert('Some fields are empty.');
			e.preventDefault();
		} else $('#form').submit();
	});

	/**
	 * Copy API key
	 */
	$('.apikey-copy').click(function() {
		var textArea = document.createElement('textarea');
		textArea.style.position = 'fixed';
		textArea.style.top = 0;
		textArea.style.left = 0;
		textArea.style.width = '2em';
		textArea.style.height = '2em';
		textArea.style.padding = 0;
		textArea.style.border = 'none';
		textArea.style.outline = 'none';
		textArea.style.boxShadow = 'none';
		textArea.style.background = 'transparent';
		textArea.value = $(this).text();
		document.body.appendChild(textArea);
		textArea.select();
		document.execCommand("copy"); //copy
		document.body.removeChild(textArea); //del textarea temp
		$(this).fadeTo(50, 0.2).fadeTo(50, 1);
	});

	$('#upload-display').on('click', (e) => {
		$('.info-upload').show(250);
		$('header, div.inner.cover, footer').css('filter', 'blur(5px)');
		return false;
	});

	$('#close-upload').on('click', (e) => {
		removePopup();
	});

	//Infos display
	$('#infos-user-display').on('click', (e) => {
		$('.infos-user').show(250);
		$('header, div.inner.cover, footer').css('filter', 'blur(5px)');
		return false;
	});

	$('#close-infos').on('click', (e) => {
		removePopup('infos');
	});

	$(document).on('click', (e) => { 
		if(!$(e.target).closest('.info-upload').length) {
			if($('.info-upload').is(":visible")) {
				removePopup();
			}
		}
		if(!$(e.target).closest('.infos-user').length) {
			if($('.infos-user').is(":visible")) {
				removePopup('infos');
			}
		}
		if(!$(e.target).closest('.infos-file').length) {
			if($('.infos-file').is(":visible")) {
				removePopup('file');
			}
		}
	});

	//Drag/drop events
	$('#upload-trigger').on('dragenter', (e) => {
		shake($('#upload-trigger'));
		return false;
	});

	$('#upload-trigger').on('dragover', (e) => {
		e.preventDefault();
		return false;
	});

	$('#upload-trigger').on('dragleave', (e) => {
		shake($('#upload-trigger'), 10);
		e.preventDefault();
		return false;
	});

	$('#upload-trigger').on('drop', (e) => {
		if(e.originalEvent.dataTransfer) {
			if(e.originalEvent.dataTransfer.files.length) {
				e.preventDefault();
				//Upload
				upload(e.originalEvent.dataTransfer.files[0]);
			}
		}
		return false;
	});

	//Input file event
	$('#inputFile').on('change', (e) => {
		//Upload
		upload($('#inputFile')[0].files[0]);
	});

	/**
	 * Pagination
	 */
	$(document).on('click', '.clickable', function() {
		let tmp = page;
		if($(this).attr('id')==='first' && page > 1) tmp = 1;
		if($(this).attr('id')==='prev' && page > 1) tmp--;
		if($(this).attr('id')==='next' && page < Math.ceil(total/filesPerPage)) tmp++;
		if($(this).attr('id')==='last' && page < Math.ceil(total/filesPerPage)) tmp = Math.ceil(total/filesPerPage);
		if(tmp != page) {
			page = tmp;
			update(page);
			$('#start').text((page-1)*filesPerPage+1);
			if(page*filesPerPage<total)
				$('#end').text(page*filesPerPage);
			else
				$('#end').text(total);
			$('#total').text(total);
			$('#each').text(filesPerPage);
			$('#act .pageInput').val(page);
		}
	});

	$('#pageInput').on('click', function() {
		$(this).val('');
	});

	$('#pageInput').keydown(function(e) {
		if(e.key.match(/\D/)) e.preventDefault();
		if(e.keyCode === 13) {
			$(this).blur();
			if($(this).val() == '') $(this).val(page);
			let tmp = $('#pageInput').val();

			if(tmp != page && tmp >= 1 && tmp <= Math.ceil(total/filesPerPage)) {
				page = tmp;
				update(page);
				$('#start').text((page-1)*filesPerPage+1);
				if(page*filesPerPage<total)
					$('#end').text(page*filesPerPage);
				else
					$('#end').text(total);
				$('#total').text(total);
				$('#each').text(filesPerPage);
				$('#act .pageInput').val(page);
			}
		}
	});//end pagination block

	/**
	 * Display infobox file
	 */
	$(document).on('click', '.get-infos-file', function(e) {
		e.preventDefault();
		var file = $(this).parent().parent().parent().attr('id');
		$('.infos-file').show(250);
		$('header, div.inner.cover, footer').css('filter', 'blur(5px)');

		$.get('/api/getInfosFile', {filename: file}, (data) => {
			if(!data.success) return;
			$('#file-tmp-id').val(file);
			$('#file-name').text(data.msg.file_name);
			$('#file-url').html('<a href="'+data.msg.url+'" target="_blank">'+data.msg.url+'</a>');
			$('#file-type').text(data.msg.media_type);
			$('#file-size').text(data.msg.size);
			$('#file-date').text(data.msg.date);
			if(data.msg.important == 0) {
				$('#file-important').text('No');
				$('#make-important').text('Make this file as important (WORK IN PROGRESS)');
			} else {
				$('#file-important').html('Yes <i class="fa fa-star" style="color:#b8b825"></i>');
				$('#make-important').text('No longer make this file as important');
			}
		});

		return false;
	});

	$('#close-infos-file').on('click', (e) => {
		removePopup('file');
	});

	//Options from infobox : mark important and delete
	$(document).on('click', '#make-important', function(e) {

	});

	$(document).on('click', '#delete-file', function(e) {

	});

	/**
	 * Requesting new API key
	 */
	$('#reset-apikey').on('click', (e) => {
		e.preventDefault();
	});

	/**
	 * Reseting pass
	 */
	$('#reset-password').on('click', (e) => {
		e.preventDefault();
	});

});