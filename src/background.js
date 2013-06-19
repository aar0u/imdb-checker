(function(window) {
	var pattern = new RegExp('<td class=\"result_text\"[^>]*?>.*?</td>');
	var pattern2 = /<span itemprop=\"ratingValue\">(\d.\d)</;
	var pattern3 = new RegExp('<body(.|\n)*?</body>');
	var pattern4 = /\?score=\d{2,3}/;
	var pattern5 = /<a href=\"criticreviews.*>.(\d*.\d*)/;
	var processAry = [];

	XMLHttpRequest.prototype.sendWithTimeout = function(timeout) {
		var that = this;
		setTimeout(function() {
			if (that.readyState < 4) that.abort();
		}, timeout);
		that.send();
	}

	function process(type) {
		this.type = type;
		this.port = null;
		this.reqAry = [];
		this.reqAry2 = [];
		this.linkAry = [];
		this.total = 0;
		this.done = 0;
		this.killed = false;
	}

	process.prototype = {
		processMsg: function(msg) {
			var that = this;
			that.total = msg.length;
			setBadge("...");
			setTitle("Checking rating...");
			for (var i = 0; i < that.total; i++) {
				var req = new XMLHttpRequest();
				that.reqAry[i] = req;
				var what = msg[i];
				while (what.indexOf(" ") != -1) what = what.replace(" ", "<space>");
				what = encodeURIComponent(what);
				while (what.indexOf("%3Cspace%3E") != -1) what = what.replace("%3Cspace%3E", "+");
				if (that.type == "imdb") that.linkAry[i] = "http://www.imdb.com/find?q=" + what + "&s=tt";
				else that.linkAry[i] = "http://www.mrqe.com/search?dir=desc&q=" + what + "&section=titles&sort=year";
				req.open("GET", that.linkAry[i], true);
				req.onload = function() {
					if (that.port.connected) that.processMsg2.bind(this)(that);
					else if (!that.killed) that.kill();
				}
				req.onerror = function() {
					var index = that.reqAry.indexOf(this);
					that.port.postMessage({
						type: that.type,
						idx: index,
						data: "Error 1",
						link: that.linkAry[index]
					});
					that.checkDone();
				}
				req.onabort = function() {
					var index = that.reqAry.indexOf(this);
					that.port.postMessage({
						type: that.type,
						idx: index,
						data: "Timeout 1",
						link: that.linkAry[index]
					});
					that.checkDone();
				}
				req.sendWithTimeout(20000);
			}
		},
		processMsg2: function(that) {
			var index = that.reqAry.indexOf(this);
			var titleLink
			if (that.type == "imdb") {
				var table = $(document.createElement("table"));
				table.html(this.responseText.match(pattern));
				titleLink = table.find('a:first').attr("href");
			} else {
				var body = $(document.createElement("body"));
				body.html(this.responseText.match(pattern3));
				titleLink = body.find(".results > ul").find('a:first').attr("href");
			}
			if (titleLink != undefined) {
				var req2 = new XMLHttpRequest();
				that.reqAry2[index] = req2;
				if (that.type == "imdb") that.linkAry[index] = "http://www.imdb.com" + titleLink;
				else that.linkAry[index] = "http://www.mrqe.com" + titleLink;
				req2.open("GET", that.linkAry[index], true);
				req2.onload = function() {
					if (that.port.connected) {
						var index2 = that.reqAry2.indexOf(this);
						var ratingAry, rating = "N/A";
						if (that.type == "imdb") {
							ratingAry = this.responseText.match(pattern2);
							if (ratingAry != null) rating = ratingAry[1];
							ratingAry = this.responseText.match(pattern5);
							if (ratingAry != null) rating = rating + ", " + ratingAry[1];
						} else {
							ratingAry = this.responseText.match(pattern4);
							if (ratingAry != null) rating = ratingAry[0].match(/\d{2,3}/)[0];
						}
						that.port.postMessage({
							type: that.type,
							idx: index2,
							data: rating,
							link: that.linkAry[index2]
						});
						that.checkDone();
					} else if (!that.killed) that.kill();
				}
				req2.onerror = function() {
					var index2 = that.reqAry2.indexOf(this);
					that.port.postMessage({
						type: that.type,
						idx: index2,
						data: "Error 2",
						link: that.linkAry[index2]
					});
					that.checkDone();
				}
				req2.onabort = function() {
					var index2 = that.reqAry.indexOf(this);
					that.port.postMessage({
						type: that.type,
						idx: index2,
						data: "Timeout 2",
						link: that.linkAry[index2]
					});
					that.checkDone();
				}
				req2.sendWithTimeout(20000);
			} else {
				that.port.postMessage({
					type: that.type,
					idx: index,
					data: "N/A",
					link: that.linkAry[index]
				});
				that.checkDone();
			}
		},
		checkDone: function() {
			var that = this;
			that.done++;
			if (that.done >= that.total) that.kill();
		},
		kill: function() {
			var that = this;
			var i, len, ary, index;
			index = processAry.indexOf(that);
			if (index >= 0) processAry.splice(index, 1);
			delete that.port;
			if (that.reqAry != undefined) {
				ary = that.reqAry;
				len = ary.length;
				for (i = 0; i < len; i++) {
					if (ary[i] != null) {
						ary[i].onabort = null;
						ary[i].abort();
					}
				}
				delete that.reqAry;
			}
			if (that.reqAry2 != undefined) {
				ary = that.reqAry2;
				len = ary.length;
				for (i = 0; i < len; i++) {
					if (ary[i] != null) {
						ary[i].onabort = null;
						ary[i].abort();
					}
				}
				delete that.reqAry2;
			}
			delete that.linkAry;
			delete that.total;
			delete that.done;
			if (processAry.length == 0) {
				setBadge("");
				setTitle("");
			}
			that.killed = true;
		}
	}

	function setBadge(s) {
		chrome.browserAction.setBadgeText({
			text: s
		})
	}

	function setTitle(s) {
		chrome.browserAction.setTitle({
			title: s
		})
	}

	chrome.extension.onConnect.addListener(function(port) {
		port.onMessage.addListener(function(msg) {
			var prc = new process("imdb");
			prc.port = port;
			processAry.push(prc);
			prc.processMsg(msg);
			port.prc = prc;

			/*var prc2 = new process("mrqe");
			prc2.port = port;
			processAry.push(prc2);
			prc2.processMsg(msg);
			port.prc2 = prc2;*/

			port.connected = true;
		});
		port.onDisconnect.addListener(function() {
			port.connected = false;
			if (port.prc != undefined) port.prc.kill();
			//if (port.prc2 != undefined) port.prc2.kill();
		});
	});
})(window);