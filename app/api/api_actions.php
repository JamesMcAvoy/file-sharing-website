<?php

/**
 * Return an error related to the API
 */
function apiError($res, $code = 405, $msg = 'Method not allowed') {

	$json = json_encode(array(
		'success' => false,
		'msg'	  => $msg
	));

	$body = $res->getBody();
	$body->write($json);

	return $res->withBody($body)->withStatus($code)->withHeader('Content-Type', 'application/json');

}

/**
 * POST API upload controller
 */
function apiUpload($req, $res, $config) {

	$db = connect($config);
	if(is_string($db)) return apiError($res, 503, $db);

	$apikey = $req->getParsedBody();
	if(empty($apikey['apikey']) || !apikeyExists($db, $apikey['apikey']))
		return apiError($res, 400, 'Invalid apikey');
	else $apikey = $apikey['apikey'];

	if(empty($req->getUploadedFiles()['file']))
		return apiError($res, 400, 'No file provided');

	$file = $req->getUploadedFiles()['file'];

	//Errors from file : http://php.net/manual/en/features.file-upload.errors.php
	if(in_array($file->getError(), [1,2]))
		return apiError($res, 413, $file::ERROR_MESSAGES[$file->getError()]);

	elseif($file->getError() != 0)
		return apiError($res, 400, $file::ERROR_MESSAGES[$file->getError()]);

	//User not allowed
	if(!isAllowedToUpload($db, $apikey))
		return apiError($res, 403, 'You are not allowed to upload');

	$last = getLastTimestamp($db, $apikey);
	$last = ($last+$config['timeBeforeNewUpload']/1000)-microtime(true);
	if($last > 0)
		return apiError($res, 429, 'Please wait '.round($last, 2).'s before a new upload');

	//Vars
	$size = $file->getSize();
	$name = $file->getClientFilename();
	$media = $file->getClientMediaType();
	$stream = $file->getStream()->getContents();

	//Max sizes supported from config file
	$websiteMaxSize = convertToBytes($config['websiteMaxSize']);
	$accountMaxSize = convertToBytes($config['accountMaxSize']);
	$uploadMaxSize  = convertToBytes($config['uploadMaxSize']);

	if($size > $uploadMaxSize)
		return apiError($res, 413, 'The uploaded file exceeds the uploadMaxSize directive from the website');

	elseif($size + getSizeUsedFromApikey($db, $apikey) > $accountMaxSize)
		return apiError($res, 413, 'You have reached your limit. Please delete some of your files');

	elseif($size + getTotalSizeUsed($db) > $websiteMaxSize)
		return apiError($res, 413, 'The website has reached its limit');

	$hash = md5($stream);
	$filename = createFilename($db, $name);

	if(strlen($name) > 40) $name = substr($name, 0, 37).'...';

	upload($db, $stream, $hash, $apikey, $filename, $media, $size, $name);

	$body = $res->getBody();
	$body->write(json_encode(array(
		'success' => true,
		'url'	  => $req->getUri()->getScheme().'://'.$req->getUri()->getHost().'/'.$filename,
		'msg'	  => $filename
	)));

	//Return 201 code (created)
	return $res->withBody($body)->withStatus(201)->withHeader('Content-Type', 'application/json');

}

/**
 * GET API uploads controller
 */
function apiGetUploads($req, $res, $config) {

	$params = $req->getQueryParams();
	$session = $req->getCookieParams();
	$db = connect($config);
	if(is_string($db)) return apiError($res, 503, $db);

	if(!isset($params['offset']))
		return apiError($res, 400, 'Empty field offset');

	if(empty($session[$config['cookieName']]) || !apikeyExists($db, $session[$config['cookieName']]))
		return apiError($res, 400, 'Invalid apikey cookie.');

	$offset = (int) $params['offset'];

	if($offset<0)
		return apiError($res, 400, 'Invalid offset');

	if($offset >= 1) $offset--;

	$offset *= $config['limitFilesPerPage'];

	//Return list
	$data = getUploads($db, $session[$config['cookieName']], $offset, $config['limitFilesPerPage']);

	$body = $res->getBody();
	$body->write(json_encode(array(
		'success' => true,
		'msg'	  => $data
	)));
	
	return $res->withBody($body)->withHeader('Content-Type', 'application/json');

}

/**
 * GET API infos controller
 */
function apiGetInfos($req, $res, $config) {

	$session = $req->getCookieParams();
	$db = connect($config);
	if(is_string($db)) return apiError($res, 503, $db);

	if(empty($session[$config['cookieName']]) || !apikeyExists($db, $session[$config['cookieName']]))
		return apiError($res, 400, 'Invalid apikey cookie.');

	list($size, $number) = getInfosUser($db, $session[$config['cookieName']]);

	$body = $res->getBody();
	$body->write(json_encode(array(
		'success' => true,
		'msg'	  => ['size' => convertToNotation($size), 'files' => $number]
	)));
	
	return $res->withBody($body)->withHeader('Content-Type', 'application/json');

}

/**
 * GET API infos file controller
 */
function apiGetInfosFile($req, $res, $config) {

	$session = $req->getCookieParams();
	$params = $req->getQueryParams();

	$db = connect($config);
	if(is_string($db)) return apiError($res, 503, $db);

	if(!isset($params['filename']))
		return apiError($res, 400, 'Empty field filename');

	if(empty($session[$config['cookieName']]) || !apikeyExists($db, $session[$config['cookieName']]))
		return apiError($res, 400, 'Invalid apikey cookie.');

	if(!filenameExists($db, $params['filename']))
		return apiError($res, 404, 'File not found');

	$infos = getInfosFile($db, $params['filename'], $session[$config['cookieName']]);
	$infos['size'] = convertToNotation($infos['size']);
	$infos['url'] = $req->getUri()->getScheme().'://'.$req->getUri()->getHost().'/'.$infos['file_name'];
	$infos['file_name'] = $infos['origin_name'];
	unset($infos['origin_name']);

	if(empty($infos))
		return apiError($res, 403, 'You did not upload this file');

	$body = $res->getBody();
	$body->write(json_encode(array(
		'success' => true,
		'msg'	  => $infos
	)));
	
	return $res->withBody($body)->withHeader('Content-Type', 'application/json');

}