
/****************************************************************************************************** 
 * A multi-device navigation menu supporting multi-level menus. It automatically resizes from a
 * traditional 'horizontal' multi-level menu on 'bigger' screens to a popup dropdown menu on smaller
 * screens.
 *
 * Version 1.0.1
 * Changes: - Better support for touch devices by using the ontouchclick plugin for event handling.
 *
 * Developer: Jos Huybrighs
 *
 * The implementation of the dropdown part is largely based on material published on the codrops blog.
 * See http://tympanus.net/codrops/2013/04/19/responsive-multi-level-menu/. Full credit for the popup
 * concept therefore goes to the author/designer mentioned in the article.
 *
 * Styles for both the horizontal menu and the popup menu are defined in 'rmlmenu.css'. You will have
 * to modify this file in order to adapt the presentation to your needs. 
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 ******************************************************************************************************/
;(function ($, win, undefined) {

    $.RMLMenu = function(element, options) {
        // Get the main element
        this.div_el = $(element);
        // Get the main <ul> element
        this.ul_el = $(element).children(":first");
        // Set list style for all <li>'s to 'none' (otherwise problem with IE10,11)
        // It is not possible to fix this in the CSS file! Strange!
        this.ul_el.find("li").css("list-style", "none");
        this._init(options);
    };

    $.RMLMenu.prototype = {

        _openForTouch: function() {
            if ( ('ontouchstart' in window) ||
			     navigator.msMaxTouchPoints ||
			     navigator.userAgent.toLowerCase().match(/windows phone os 7/i)) {
                this.submenus = $('li:has(ul)', this.ul_el);
                var curItem = false;
                this.submenus.on('click', function (e) {
                    var item = $(this);
                    if (item[0] != curItem[0]) {
                        e.preventDefault();
                        curItem = item;
                    }
                });
                $(document).on('click touchstart MSPointerDown', function (e) {
                    var resetItem = true;
                    var parents = $(e.target).parents();
                    for (var i = 0; i < parents.length; i++) {
                        if (parents[i] == curItem[0]) {
                            curItem = false;
                            break;
                        }
                    }
                });
            }
        },

        _openPopupMenu: function () {
            var self = this;
            this.div_el.show();
            this.isOpen = true;
            // Attach event handler to <html> to close the popupmenu when someone clicks
            // outside the menu
            $('html').on('click', function () {
                if (self.isOpen) {
                    self._closePopupMenu();
                }
            });
            // Notify plugin owner
            this.settings.onPopupMenuOpen();
        },

        _closePopupMenu: function () {
            // Notify plugin owner
            this.settings.onPopupMenuClose();
            this.div_el.hide();
            this.isOpen = false;
            this.ul_el.removeClass('dl-subview');
            this.menuitems.removeClass('dl-subview dl-subviewopen');
            // Detach event handler from <html>
            $('html').off();
        },

        _constructPopupMenu: function () {
            var self = this;
            this.div_el.hide();
            this.isOpen = false;

            this.div_el.addClass('rmlPopupPanel');

            // Add top Menu title
            this.div_el.prepend('<h3 class="rmlMenuText">' + this.settings.pMenuTitle + '</h3>');
            this.menuTitleEl = this.div_el.find('h3:first');
            this.menuTitleEl.ontouchclick(function (e) {
                // Close menu
                if (self.isOpen) {
                    self._closePopupMenu();
                }
            });

            // Get all <li> elements and attach event listener to those elements
            this.menuitems = this.ul_el.find('li');

            // Get all submenus, add a 'Back' link on top of their lists and attach
            // an event listener to the 'Back' links.
            var submenus = this.ul_el.find('ul');
            submenus.prepend('<li class="rmlm-back"><a href="#">' + this.settings.pMenuBackText + '</a></li>');
            this.back = submenus.find('li:first');
            this.back.ontouchclick(function (event) {
                // Back item clicked
                if (self.isOpen) {
                    $this = $(event.currentTarget);
					var submenu = $this.parents('ul:first');
					var item = submenu.parent();
					item.removeClass('dl-subviewopen');
					var subview = $this.parents('.dl-subview:first');
					if (subview.is('li')) {
						subview.addClass('dl-subviewopen');
					}
					subview.removeClass('dl-subview');
                }
			});

            // Attach event listener to all <li> elements (except the above 'back' elements)
            this.menuitems.ontouchclick(function (event) {
                if (self.isOpen) {
                    var item = $(event.currentTarget);
                    // Check if touch/click must result in bringing up a submenu
                    var submenu = item.children('ul');
                    if (submenu.length > 0) {
                        self.ul_el.addClass('dl-subview');
                        item.addClass('dl-subviewopen').parents('.dl-subviewopen:first').removeClass('dl-subviewopen').addClass('dl-subview');
                        self.settings.onLevelClick(item, item.children('a:first').text());
                    }
                    else {
                        // No submenu - Pass to a possible optional click handler
                        isHandled = self.settings.onLinkClick(item, event);
						if ( !isHandled ) {
							var link = item.find('a:first');
							var call = link.attr('href');
							location.href = call;							
						}
                        self._closePopupMenu();
                    }
                }
            });

            // Capture click on possible empty space of the panel to prevent that
            // the event propagates to the <html>.on handler (which closes the popup).
            this.div_el.on('click', function (event) {
                if (self.isOpen) {
                    event.stopPropagation();
                }
            });
        },

        _destroyPopupMenu: function () {
            if (this.isOpen) {
                this._closePopupMenu();
            }
            this.div_el.off();
            this.menuitems.off();
            this.menuitems = [];
            this.back.off();
            $.each(this.back, function (i, el) {
                $(el).remove();
            });
            this.back = [];
            this.menuTitleEl.off();
            this.menuTitleEl.remove();
            this.div_el.removeClass('rmlPopupPanel');
            this.div_el.show();
        },

        _init: function (options) {
            var self = this;
            var defaults =
            {
                pMenuBttn: '#popupMenuBttn',
                pMenuBackText: 'Back',
                pMenuTitle: 'Menu',
                // Callback: click a link that has a sub menu
                // el is the link element (li); name is the level name
                onLevelClick: function (el, name) { return false; },
                // Callback: click a link that does not have a sub menu
                // el is the link element (li); ev is the event obj
                onLinkClick: function (el, ev) { return false; },
                // Callback: called when popup menu is constructed
                onPopupMenuOpen: function() { return false; },
                // Callback: called when popup menu is destructed
                onPopupMenuClose: function() { return false; }
            };
            this.settings = $.extend(defaults, options || {});

            var isPMenuBttnHidden = !$(self.settings.pMenuBttn).is(':visible');
            this.ul_el.attr('class', isPMenuBttnHidden ? 'rmlmenu' : 'rmlpopupmenu');
            if (!isPMenuBttnHidden) {
                this._constructPopupMenu();
            }
            else {
                this.div_el.show();
            }
            var bttnElem = $(this.settings.pMenuBttn);
            bttnElem.ontouchclick(function (e) {
                // Open/close menu
                if (!self.isOpen) {
                    self._openPopupMenu();
                }
                else {
                    self._closePopupMenu();
                }
            });

            $(window).resize(function() {
                var bttnHidden = !$(self.settings.pMenuBttn).is(':visible');
                // Only deal with resize at the moment the popup-menu button
                // appears and disappears
                if (bttnHidden != isPMenuBttnHidden) {
                    isPMenuBttnHidden = bttnHidden;
                    self.ul_el.attr('class', isPMenuBttnHidden ? 'rmlmenu' : 'rmlpopupmenu');
                    if (isPMenuBttnHidden) {
                        self._destroyPopupMenu();
                        self.ul_el.show();
                    }
                    else {
                        self._constructPopupMenu();
                    }
                };
            });
        }
    };

    $.fn.rmlmenu = function(options)
    {
        return this.each(function()
        {
            if ( $(this).data('rmlmenu-plugin')) return;
            var plugin = new $.RMLMenu(this, options);
            $(this).data('rmlmenu-plugin', plugin);
        });
    };

})(jQuery);