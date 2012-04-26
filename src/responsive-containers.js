/*
MIT Licensed.
Copyright (c) 2011 Andy Hume (http://andyhume.net, andyhume@gmail.com).

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function(win) {

    var doc = win.document,
        els = [],
        check_data_attributes = true,
        loaded = false;

    function add(elements, query, value, class_name) {
        var split_value = /([0-9]*)(px|em)/.exec(value);
        for (var i = 0, j = elements.length; i<j; ++i) {
            var el = elements[i];
            el.cq_rules = el.cq_rules || [];
            el.cq_rules.push([null, query, split_value[1], split_value[2], class_name]);
            els.push(el);
        }
        if (loaded) { // if we're not 'loaded' yet, domLoaded will run applyRules() for us.
            applyRules();
        }
    }

    function ignoreDataAttributes() {
        check_data_attributes = false;
    }


    function anyFirstItemMatches(hay, needle){
        for (var c = hay.length - 1; c >= 0; c--) {
            if (hay[c][0] == needle) {
                return true;
            }
        }
    }
    function findSelectorQueries() {
        var sheets = document.styleSheets;
        for (var s = sheets.length - 1; s >= 0; s--) {
            var rules = sheets[s].rules || sheets[s].cssRules;
            for (var r = rules.length - 1; r >= 0; r--) {
                var selector = rules[r].selectorText;
                if (selector && selector.indexOf('query="') != -1) {
                    // 0:before, 1:wholequery, 2:query, 3:after
                    var selector_parts = selector.split(/(\[query="(.+)"\])/);
                    if (selector_parts) {
                        var cq_rules = [];
                        var raw_rules = selector_parts[2].split(" ");
                        var rules_classes = [];
                        for (var k = raw_rules.length - 1; k >= 0; k--) {
                            var class_name = 'query-' + raw_rules[k].replace(':', '-');
                            rules_classes.push('.' + class_name);
                            var rule = /(.*):([0-9]*)(px|em)/.exec(raw_rules[k]);
                            rule.push(class_name);
                            if (rule) {
                                cq_rules.push(rule);
                            }
                        }

                        var new_selector = selector.replace(selector_parts[1], rules_classes.join(''));
                        rules[r].selectorText = new_selector;
                        if (rules[r].selectorText != new_selector) {
                            // Firefox doesn't support just changing the selectorText,
                            // so we copy the rule with the new selector
                            if (sheets[s].insertRule) {
                                var new_rule = rules[r].cssText.replace(rules[r].selectorText, new_selector);
                                sheets[s].insertRule(new_rule, r);
                            }
                        }

                        var nodes = document.querySelectorAll(selector_parts[0]);
                        for (var i = nodes.length - 1; i >= 0; i--) {
                            var el = nodes[i];
                            el.cq_rules = el.cq_rules || [];
                            if (!anyFirstItemMatches(el.cq_rules, selector_parts[2])) {
                                el.cq_rules = el.cq_rules.concat(cq_rules);
                                els.push(el);
                            }
                        }
                    }
                }
            }
        }
    }

    function findContainerQueries() {
        if (check_data_attributes) {
            // Find data-squery attributes.
            var nodes = [];
            if (doc.querySelectorAll) {
                var nodes = doc.querySelectorAll("[data-squery]");
            } else {
                // If no query selectors.
                var e = doc.getElementsByTagName("*");
                for (var i = 0, j = e.length; i<j; ++i) {
                    if (e[i].getAttribute("data-squery")) {
                        nodes.push(e[i]);
                    }
                }
            }
            // Parse the data-squery attribute and store resulting rules on the element.
            for (var i = 0, j = nodes.length; i<j; ++i) {
                var el = nodes[i];
                var cq_rules = [];
                var raw_rules = el.getAttribute("data-squery").split(" ");
                for (var k = 0, l = raw_rules.length; k<l; ++k) {
                    var rule = /(.*):([0-9]*)(px|em)=(.*)/.exec(raw_rules[k]);
                    if (rule) {
                        cq_rules.push(rule);
                    }
                }
                el.cq_rules = el.cq_rules || [];
                el.cq_rules = el.cq_rules.concat(cq_rules);
                els.push(el);
            }
        }
    }

    function applyRules() {
        // For each element, apply the rules to the class name.
        for (var i = 0, j = els.length; i<j; ++i) {
            el = els[i];
            for (var k = 0, l = el.cq_rules.length; k<l; ++k) {
                var rule = el.cq_rules[k];

                // Get a target width value in pixels.
                var width = parseInt(rule[2]);
                if (rule[3] === "em") {
                    width = emsToPixels(parseFloat(rule[2]), el);
                }

                // Calculate the width of the target without the class added.
                var defaultWidth = getDefaultWidth(el, rule[4]);
                // Test current width against target width and add/remove class values.
                if ( compareFunction[rule[1]](defaultWidth, width) ) {
                    if (el.className.indexOf(rule[4]) < 0) {
                        el.className += " " + rule[4];
                    }
                } else {
                    var class_name = el.className.replace(new RegExp('(^| )'+rule[4]+'( |$)'), '$1');
                    class_name = class_name.replace(/ $/, '');
                    el.className = class_name;
                }
            }
        }
    }

    var compareFunction = {
        "min-width": function(a, b) {
            return a > b;
        },
        "max-width": function(a, b) {
            return a < b;
        }
    }

    function contentReady() {
        if (loaded) {
            return;
        }
        loaded = true;
        findContainerQueries();
        findSelectorQueries();
        applyRules();
        if (win.addEventListener) {
            win.addEventListener("resize", applyRules, false);
        }
        // Allow for resizing text after the page has loaded.
        var current_em = emsToPixels(1, doc.body);
        win.setInterval(function() {
            var new_em = emsToPixels(1, doc.body);
            if (new_em !== current_em) {
                applyRules();
                current_em = new_em;
            }
        }, 100);
    }

    function memoize( f ) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            f.memoize = f.memoize || {};
            return (args in f.memoize) ? f.memoize[args] : f.memoize[args] = f.apply(this, args);
        };
    }

    var emsToPixels = memoize(function(em, scope) {
        var test = doc.createElement("div");
        test.style.fontSize = "1em";
        test.style.margin = "0";
        test.style.padding = "0";
        test.style.border = "none";
        test.style.width = "1em";
        scope.appendChild(test);
        var val = test.offsetWidth;
        scope.removeChild(test);
        return Math.round(val * em);
    });

    var getDefaultWidth = function(el, class_name) {
        var test = el.cloneNode(true);
        test.className = (" " + test.className + " ").replace(" " + class_name + " ", " ");
        test.style.height = 0;
        test.style.visibility = "none";
        test.style.overflow = "hidden";
        test.style.clear = "both";
        var parent = el.parentNode;
        parent.insertBefore(test, el);
        var val = test.offsetWidth;
        parent.removeChild(test);
        return val;
    }

    if (doc.addEventListener) {
        doc.addEventListener("DOMContentLoaded", contentReady, false);
        // or
        win.addEventListener("load", contentReady, false);
    }
    // If old IE
    else if (doc.attachEvent) {
        doc.attachEvent("onreadystatechange", contentReady);
        // or
        win.attachEvent("onload", contentReady);
    }


    win["SelectorQueries"] = {
        "add": add,
        "ignoreDataAttributes": ignoreDataAttributes
    }

})(this);