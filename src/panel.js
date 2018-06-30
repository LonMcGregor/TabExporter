"use strict";

/* Aliases for sanity */
const $ = document.querySelector.bind(document);
const $a = document.querySelectorAll.bind(document);
const $$ = document.createElement.bind(document);


function makeHtml(){

}

/**
 * Init page i18n and listeners
 */
$("#html").innerText = chrome.i18n.getMessage("ashtml");
$("#html").addEventListener("click", makeHtml);
document.title = chrome.i18n.getMessage("name");
