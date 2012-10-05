function getStyle(el, styleProp) {
	// From http://www.quirksmode.org/dom/getstyles.html
	var y;
	if (el.currentStyle) {
		y = el.currentStyle[styleProp];
	} else if (window.getComputedStyle) {
		y = document.defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
	}
	return y;
}

window.onload = function() {

    var test_small = document.getElementById("test-small");
    var test_big = document.getElementById("test-big");

    test("Matching element", function() {
        equal(getStyle(test_big, 'height'), '10px', "Large element should match");
    });

    test("Not matching element", function() {
        equal(getStyle(test_small, 'height'), '10px', "Small element should not match");
    });
};
