(function(window) {
	var textAry = [],
		titleAry = [];
	var domainRex = new RegExp("http://(www|).*?\.(sg|com)");
	var domain = window.top.document.location.href.match(domainRex)[0];
	if (domain.indexOf("shaw.sg") !== -1) {
		$(".txtNormalDim").each(function(index) {
			var title = $("a[class='txtHeaderBold'][href^='sw_moviedetails.aspx']:eq(" + index + ")").text();
			title = title.replace(/DIGITAL.*?\[.+?]/, "").replace(/\[.+?]/, "").trim();
			titleAry[index] = title;
			textAry[index] = $(this).text($(this).text() + " (IMDb - ...)");
		});
	} else if (domain.indexOf("fgcineplex.com") !== -1) {
		$(".section_header_orange").each(function(index) {
			var title = $("a", this).text();
			title = title.replace(/\(Digital\)/, "").replace(/\[.+?]/, "").trim();
			titleAry[index] = title;
			textAry[index] = $(this).text($(this).text() + " (IMDb - ...)");
		});
	} else if (domain.indexOf("cathaycineplexes.com") !== -1) {
		$(".title").each(function(index) {
			var title = $(this).text();
			title = title.replace(/\(Digital\)/, "").replace(/\[.+?]/, "").trim();
			titleAry[index] = title;
			var rating = $("<span> (IMDb - ...)</span>");
			$(this).after(rating);
			textAry[index] = rating;
		});
	} else if (domain.indexOf("gv.com") !== -1) {
		$("#tabContent1").unbind('DOMNodeInserted').bind('DOMNodeInserted', gvFunc);
		$("#tabPanel1").find("a:first").bind("click", function() {
			$("#tabContent1").unbind('DOMNodeInserted').bind('DOMNodeInserted', gvFunc);
		})
	}

	function gvFunc() {
		$("#tabContent1").unbind('DOMNodeInserted');
		$(".movie").each(function(index) {
			var title = $(this).text();
			title = title.replace(/\(Digital\)/, "").replace(/\[.+?]/, "").replace(/\(.+?\)/, "").trim();
			titleAry[index] = title;
			var rating = $("<span> (IMDb - ...)</span>");
			$(this).after(rating);
			textAry[index] = rating;
		});
		port.postMessage(titleAry);
	}

	var port = chrome.extension.connect();

	if (titleAry.length > 0) port.postMessage(titleAry);

	port.onMessage.addListener(function(msg) {
		var txt = textAry[msg.idx];
		msg.link = msg.link.replace("'", "\u2019");
		txt.html(txt.text().replace("(IMDb - ...)", "<a style='color:#FFAE00;text-decoration:none;font-weight:bold;' target='_blank' href='" + msg.link + "'>(IMDb - " + msg.data + ")</a>"));
	});
})(window);