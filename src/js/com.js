
//ajax请求  浏览器本地存储（*各种存储的特点） 密码加密  输入值的规则验证
//（精彩课程） 搜索自动补全

(function(win,$,mui,undefined){
	$.ajax({
		url : "/config.json",
		async : false
	}).done(function(config){
		window.config = config;
	});
	var Utils = {
		/* 遮罩 MUI相关
		   示例：Utils.mask.show()/Utils.mask.hide()
		*/
		mask : (function(){
			var mask = mui.createMask();
			return {
				show : mask.show,
				hide : mask.close
			}
		})(),
		/* alert MUI相关
			@param {String} alertId 必须为ID
			@param {String} content 可以是以.tpl/.html为后缀的模板,也可以是字符串。
			@param {String} title
			@param {Function} callback 点击确定按钮之后的回调函数
		   示例：Utils.alert("alertId","显示提示内容","显示标题",回调函数)
		*/
		alert : function(alertId,content,title,callback){
			var trigger = function(){
				$("#"+alertId).on('tap', function() {
					mui.alert(content, title, callback);
				});
				$("#"+alertId).trigger("tap");
			};
			if(content.indexOf(".tpl") >-1 || content.indexOf(".html") >-1){
				ajax({
					url : content
				}).done(function(tpl){
					content = tpl ;
					trigger();
				}).fail(function(err){
					content = err;
					trigger();
				})
			}else{
				trigger();
			}
		},
		/* 下方上滑菜单 MUI相关
			@param
		   示例：Utils.actionsheet()
		  	<a href="#picture" class="mui-btn">打开actionsheet</a>
		   <div id="picture" class="mui-popover mui-popover-action mui-popover-bottom">
				<ul class="mui-table-view">
					<li class="mui-table-view-cell">
						<a href="#">拍照或录像</a>
					</li>
					<li class="mui-table-view-cell">
						<a href="#picture"><b>取消</b></a> 此处关闭的按钮要和父元素一样
					</li>
				</ul>
			</div>

		*/
		actionsheet : function(){
			$('body').on('tap', '.mui-popover-action li>a', function() {
				var a = this,
					parent;
				//根据点击按钮，反推当前是哪个actionsheet
				for (parent = a.parentNode; parent != document.body; parent = parent.parentNode) {
					if (parent.classList.contains('mui-popover-action')) {
						break;
					}
				}
				//关闭actionsheet
				$('#' + parent.id).popover('toggle');
				//info.innerHTML = "你刚点击了\"" + a.innerHTML + "\"按钮";
			});
		},
		urlSlice : function(url){
			   var result=[],
			   	   num=url.indexOf("?"),
			   	   str=url.substr(num+1),
			   	   arr=str.split("&"); //各个参数放到数组里
			   for(var i=0;i < arr.length;i++){
				    num=arr[i].indexOf("=");
				    if(num>0){
					     name=arr[i].substring(0,num);
					     value=arr[i].substr(num+1);
					     result[name]=value;
				    }
			    }
			return result;
		},
		getVideo : function(vid){
			$(".load-video").attr("id","plv_"+vid);
			var script = document.createElement("script");
			script.src="http://player.polyv.net/script/polyvplayer.min.js";
			script.onload=function(){
				var player = polyvObject('#plv_'+vid).videoPlayer({
				    'width':'100%',
				  	'height':'280px',
				    'vid' : vid
				});
			};
			$("head")[0].appendChild(script);

		},
		//obj:
		inputMask : function(storageName,url,success,fail){
			var storageName = storageName || [],
				storageArr = storageLocal(storageName),
				result = "";
			storageArr.forEach(function(v){
				result += "<li><a>"+v+"</a></li>";
			});
			$("#historyUl").append(result);
			$(".search-input").on("focus",function(e){
				$("#modal").addClass("mui-active");

			});
			$(".search-input").on("blur",function(e){
				var value = $(this).val();
				storageName.unshift(value);
				storageLocal(storageName,storageName);
				ajax({
					url:url,
					data:{
						name : value
					}
				})
				.done(function(data){
					success(data);
				})
				.fail(function(err){
					fail(err);
				})
			});

		}
	},
	/*  ajax请求
		示例：ajax("list/list").done(console.log("正确")).fail(console.log("错误"))
	*/
	ajax = function(settings){
		var sid = storageLocal("sid");
		var defaults = {
			type : "get",
			headers:{
				"sid" : sid
			}
			// dataType : "json",
			// contentType : "application/x-www-form-urlencoded"
		},
		settings = Is.str(settings)?{url:settings} : settings,
		dfd = $.Deferred(),
		options = $.extend({},defaults,settings);

		Utils.mask.show();
		$.ajax(options)
		.done(function(data) {
			Utils.mask.hide();
			switch (data.ec){
				case 0:
					dfd.resolve(data);
					break;
				case -100:
					Utils.alert("请登录","信息提示");
					window.location.href = "/account/login.html";
					break;
				default:
					dfd.reject(data);
			}
		})
		.fail(function(err) {
			Utils.mask.hide();
			dfd.reject(err);
		});
		return dfd;
	},
	/*
		文件上传：
		示例：fileUpload({
			url:"",
			file:""
		})
	*/
	fileUpload = function(settings){
		var file = settings.file,
			singleFiles = function(fil){
				if(fil instanceof File){
					var upload = function(fil,type){
						var reader = new FileReader();
						reder.readAsArrayBuffer(fil);
						$(document).on("onlodend",function(){
							var options = {
								headers :{
									"content-Type":type,
									"Filename":encodeURIComponent(fil.name)
								},
								url : settings.url
							};
							ajax(options);
						});
					};
					upload(fil,fil.type);
				}
			};
		if(file && Is.array(fils)){
			file.forEach(function(fil){
				singleFiles(fil);
			})
		}else if(file && Is.str(file)){
			singleFiles(fil);
		}else{
			ajax(settings.url);
		}
	},
	storageLocal = function(name,value){
		var	storage = window.localStorage;
		if(value){
			storage.setItem(name,value)
		}else{
			return storage.getItem(name)
		}
	},
	adapter = function(data){
		var result=[[],[],[]];
		for(var i=0;i<data.length;i++){
			result[data[i].category].push(data[i]);
		}
		return result;
	};
	/*
	 * 实现一个domReady的发布订阅，基于jquery on事件，处理业务js的执行时机
	 */

	$.allReady=function(fn){
		if(!fn){
			$(document).trigger("allReady");
		}else{
			$(document).on("allReady",fn);
		}
	}
	$.extend(window,{
		Utils : Utils,
		ajax : ajax,
		fileUpload : fileUpload,
		storageLocal : storageLocal ,
		adapter : adapter
	});
})(window,jQuery,mui);
