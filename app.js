var api_gates=[
	'https://node.viz.plus/',
	'https://vizrpc.lexa.host/',
	'https://viz-node.dpos.space/',
	'https://solox.world/',
];
var default_api_gate=api_gates[0];
var best_gate=-1;
var best_gate_latency=-1;
var api_gate=default_api_gate;
console.log('using default node',default_api_gate);
viz.config.set('websocket',default_api_gate);

select_best_gate();

function update_api_gate(value=false){
	if(false==value){
		api_gate=api_gates[best_gate];
	}
	else{
		api_gate=value;
	}
	console.log('using new node',api_gate,'latency: ',best_gate_latency);
	viz.config.set('websocket',api_gate);
}

function select_best_gate(){
	for(i in api_gates){
		let current_gate=i;
		let current_gate_url=api_gates[i];
		let latency_start=new Date().getTime();
		let latency=-1;

		let protocol='websocket';
		let gate_protocol=current_gate_url.substring(0,current_gate_url.indexOf(':'));

		if('http'==gate_protocol||'https'==gate_protocol){
			protocol='http';
		}
		if('websocket'==protocol){
			let socket = new WebSocket(current_gate_url);
			socket.onmessage=function(event){
				latency=new Date().getTime() - latency_start;
				if(best_gate!=current_gate){
					if((best_gate_latency>latency)||(best_gate==-1)){
						best_gate=current_gate;
						best_gate_latency=latency;
						update_api_gate();
					}
				}
				socket.close();
			}
			socket.onopen=function(){
				socket.send('{"id":1,"method":"call","jsonrpc":"2.0","params":["database_api","get_dynamic_global_properties",[]]}');
			};
		}
		if('http'==protocol){
			let xhr = new XMLHttpRequest();
			xhr.overrideMimeType('text/plain');
			xhr.open('GET',current_gate_url);
			xhr.setRequestHeader('accept','application/json, text/plain, */*');
			xhr.setRequestHeader('content-type','application/json');
			xhr.onreadystatechange = function() {
				if(4==xhr.readyState && 200==xhr.status){
					latency=new Date().getTime() - latency_start;
					console.log('check node',current_gate_url,'latency: ',latency);
					if(best_gate!=current_gate){
						if((best_gate_latency>latency)||(best_gate==-1)){
							best_gate=current_gate;
							best_gate_latency=latency;
							update_api_gate();
						}
					}
				}
			}
			xhr.send('{"id":1,"method":"call","jsonrpc":"2.0","params":["database_api","get_dynamic_global_properties",[]]}');
		}
	}
}

var users={};
var current_user='';
var default_energy_step=500;//5.00%

if(null!=localStorage.getItem('users')){
	users=JSON.parse(localStorage.getItem('users'));
}
if(null!=localStorage.getItem('current_user')){
	current_user=localStorage.getItem('current_user');
}

function save_session(){
	let users_json=JSON.stringify(users);
	localStorage.setItem('users',users_json);
	localStorage.setItem('current_user',current_user);
}

function save_account_settings(view,login,regular_key,energy_step){
	login=login.toLowerCase();
	if('@'==login.substring(0,1)){
		login=login.substring(1);
	}
	login=login.trim();
	regular_key=regular_key.trim();
	if(''==login){
		view.find('.submit-button-ring').removeClass('show');
		view.find('.error').html(ltmp_arr.account_seetings_empty_account);
		view.find('.button').removeClass('disabled');
		return;
	}
	if(''==regular_key){
		view.find('.submit-button-ring').removeClass('show');
		view.find('.error').html(ltmp_arr.account_seetings_empty_regular_key);
		view.find('.button').removeClass('disabled');
		return;
	}
	viz.api.getAccounts([login],function(err,response){
		if(typeof response[0] !== 'undefined'){
			let regular_valid=false;
			for(regular_check in response[0].regular_authority.key_auths){
				if(response[0].regular_authority.key_auths[regular_check][1]>=response[0].regular_authority.weight_threshold){
					try{
						if(viz.auth.wifIsValid(regular_key,response[0].regular_authority.key_auths[regular_check][0])){
							regular_valid=true;
						}
					}
					catch(e){
						view.find('.submit-button-ring').removeClass('show');
						view.find('.error').html(ltmp_arr.invalid_regular_key);
						view.find('.button').removeClass('disabled');
						return;
					}
				}
			}
			if(!regular_valid){
				view.find('.submit-button-ring').removeClass('show');
				view.find('.error').html(ltmp_arr.not_found_regular_key);
				view.find('.button').removeClass('disabled');
				return;
			}
			//clear users, maybe multi-account support in future
			users={};
			users[login]={'regular_key':regular_key,'energy_step':energy_step};
			current_user=login;
			save_session();

			view.find('.submit-button-ring').removeClass('show');
			view.find('.success').html(ltmp_arr.account_settings_saved);
			view.find('.button').removeClass('disabled');
		}
		else{
			console.log(err);
			view.find('.submit-button-ring').removeClass('show');
			view.find('.error').html(ltmp_arr.account_seetings_account_not_found);
			view.find('.button').removeClass('disabled');
			return;
		}
	});
}

var level=0;
var path='viz://';
var search='';

var ltmp_arr={
	none:'<div class="none"><em>Ничего не найдено.</em></div>',
	account_settings:'<a data-href="fsp:account_settings">[настройки]</a>',
	account_settings_caption:'Настройки аккаунта',
	account_seetings_empty_account:'Введите аккаунт',
	account_seetings_empty_regular_key:'Введите регулярный ключ',
	account_seetings_account_not_found:'Аккаунт не найден',
	account_settings_saved:'Данные аккаунта сохранены',

	invalid_regular_key:'Предоставленный ключ недействителен',
	not_found_regular_key:'Предоставленный ключ не подходит',

	search:'<a data-href="fsp:search">[поиск]</a>',
	search_caption:'Поиск',
};

function app_mouse(e){
	if(!e)e=window.event;
	var target=e.target || e.srcElement;
	if(typeof $(target).attr('data-href') != 'undefined'){
		var href=$(target).attr('data-href');
		/*//change menu element state
		if($(target).hasClass('menu-el')){
			if('none'==$('.menu-list').css('float')){
				$('.menu-list').css('display','none');
			}
		}
		*/
		view_path(href,{},true,false);
		e.preventDefault();
	}
	if($(target).hasClass('save-account-action')){
		if(!$(target).hasClass('disabled')){
			$(target).addClass('disabled');

			let view=$(target).closest('.view');
			view.find('.submit-button-ring').addClass('show');
			view.find('.error').html('');
			view.find('.success').html('');

			let viz_account=view.find('input[name="viz_account"]').val();
			let viz_regular_key=view.find('input[name="viz_regular_key"]').val();
			save_account_settings(view,viz_account,viz_regular_key,default_energy_step);
		}
	}
	if($(target).hasClass('back-action')){
		$('.loader').css('display','block');
		$('.view').css('display','none');

		if(0<$('.view[data-level="'+level+'"]').length){
			$('.view[data-level="'+level+'"]').remove();
		}

		level--;
		path='viz://';
		search='';
		//search prev level props
		if(0<$('.view[data-level="'+level+'"]').length){
			if(typeof $('.view[data-level="'+level+'"]').data('path') != 'undefined'){
				path=$('.view[data-level="'+level+'"]').data('path');
			}
			if(typeof $('.view[data-level="'+level+'"]').data('search') != 'undefined'){
				search=$('.view[data-level="'+level+'"]').data('search');
			}
		}
		//trigger view_path with update prop
		view_path(path,{},true,true);
	}
	/*
	//button to scroll top, need to show it for long views on scrolling more that 100hv?
	if($(target).hasClass('go-top')){
		$(window)[0].scrollTo({behavior:'smooth',top:0});
	}
	*/
}

function view_account_settings(view,path_parts,title){
	document.title=ltmp_arr.account_settings_caption+' - '+title;
	view.find('.header .caption').html(ltmp_arr.account_settings_caption);

	view.find('.button').removeClass('disabled');
	view.find('.submit-button-ring').removeClass('show');
	view.find('.error').html('');
	view.find('.success').html('');

	view.find('input').val('');

	view.find('input[name=viz_account]').val(current_user);
	view.find('input[name=viz_regular_key]').val(users[current_user].regular_key);

	$('.loader').css('display','none');
	view.css('display','block');
}

function view_search(view,path_parts,title){
	document.title=ltmp_arr.search_caption+' - '+title;
	view.find('.header .caption').html(ltmp_arr.search_caption);
	view.find('input[name=search]').val('');
	$('.loader').css('display','none');
	view.css('display','block');
	//focus working only after parent block is show up
	view.find('input[name=search]')[0].focus();
}

function app_keyboard(e){
	if(!e)e=window.event;
	var key=(e.charCode)?e.charCode:((e.keyCode)?e.keyCode:((e.which)?e.which:0));
	let char=String.fromCharCode(key);
	//console.log(key,char);
	/*
	if(key==27){
		e.preventDefault();
	}
	*/
}

function parse_fullpath(){
	let fullpath=window.location.hash.substr(1);
	path='';
	search='';
	if(-1==fullpath.indexOf('?')){
		path=fullpath;
	}
	else{
		path=fullpath.substring(0,fullpath.indexOf('?'));
		search=fullpath.substring(fullpath.indexOf('?')+1);
	}
	if(''==path){
		path='viz://';
	}
}

function view_path(location,state,save_state,update){
	//save to history browser
	save_state=typeof save_state==='undefined'?false:save_state;
	//update current level?
	update=typeof update==='undefined'?false:update;
	var path_parts=[];
	var title='Free Speech Project';

	if(typeof state.path == 'undefined'){
		if(-1!=location.indexOf('viz://')){
			path_parts=location.substr(location.indexOf('viz://')+6).split('/');
		}
		else{
			path_parts=location.split('/');
		}
	}
	else{
		path_parts=state.path;
	}

	//work with path_parts, form new view or update current
	//clearTimeout(update_dgp_timer);
	//$('.view').css('display','none');

	if(save_state){
		history.pushState({path,title},'','#'+location);
	}

	document.title=title;

	console.log('location: '+location,path_parts,'search: '+search);

	if(''==path_parts[0]){
		$('.loader').css('display','block');
		$('.view').css('display','none');
		let view=$('.view[data-level="0"]');
		let header='';
		header+=ltmp_arr.account_settings;
		header+=ltmp_arr.search;
		view.find('.header').html(header);
		view.find('.objects').html(ltmp_arr.none);
		level=0;
		$('.loader').css('display','none');
		view.css('display','block');
	}
	else{
		if(0==path_parts[0].indexOf('fsp:')){
			$('.loader').css('display','block');
			$('.view').css('display','none');
			let view=$('.view[data-path="'+path_parts[0]+'"]');
			level++;
			//view.data('level',level);
			//execute view_ function if exist to prepare page (load vars to input)
			let current_view=path_parts[0].substring(('fsp:').length);
			if(typeof window['view_'+current_view] === 'function'){
				setTimeout(window['view_'+current_view],1,view,path_parts,title);
			}
			else{
				$('.loader').css('display','none');
				view.css('display','block');
			}
		}
	}
	/*
	if(''!=location){
		if($('.view[data-path="'+location+'"]').length>0){
			$('.view[data-path="'+location+'"]')[0].scrollIntoView({behavior:'smooth',block:'start'});
		}
	}
	else{
		$(window)[0].scrollTo({behavior:'smooth',top:0});
	}*/
}

function escape_html(text) {
	var map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return text.replace(/[&<>"']/g,function(m){return map[m];});
}

$(window).on('hashchange',function(e){
	e.preventDefault();
	parse_fullpath();
	view_path(path,{},true,false);
});

parse_fullpath();
view_path(path,{},false,false);

document.addEventListener('click',app_mouse,false);
document.addEventListener('tap',app_mouse,false);
document.addEventListener('keyup',app_keyboard,false);