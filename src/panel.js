"use strict";

/* Aliases for sanity */
const $ = document.querySelector.bind(document);

/**
 * Title
 * @returns string of html page title
 */
function getTitle(){
    return chrome.i18n.getMessage("mytabs").replace("%s", new Date().toLocaleString());
}

/**
 * Make a tab item for html
 * @param {*} tab Tab object
 * @param doc Document object
 * @returns html of tab item
 */
function generateTabItem(tab, doc){
    const par = doc.createElement("p");
    const item = document.createElement("a");
    item.href = tab.url;
    item.innerText = tab.title;
    par.appendChild(item);
    return par;
}

/**
 * Get html page with tab info
 * @param {*} tabs array of Tab
 * @returns document object of tab page
 */
function generateHtml(tabs){
    const tabPage = document.implementation.createHTMLDocument(getTitle());
    const encoding = tabPage.createElement("meta");
    encoding.charset = "utf-8";
    tabPage.head.appendChild(encoding);
    const header = tabPage.createElement("h1");
    header.innerText = getTitle();
    tabPage.body.appendChild(header);
    tabs.forEach(tab => {
        tabPage.body.appendChild(generateTabItem(tab, tabPage));
    });
    return tabPage;
}

/**
 * Make and download the HTML page
 */
function makeHtml(){
    chrome.tabs.query({}, tabs => {
        const page = generateHtml(tabs);
        const htmlfile = new File(
            [`<!DOCTYPE html>` + page.documentElement.innerHTML],
            getTitle()+".html",
            {type: "text/html"}
        );
        const blob = window.URL.createObjectURL(htmlfile);
        chrome.tabs.create({url: blob}, () => {
            window.URL.revokeObjectURL(blob);
        });
    });
}


/**
 * Init page i18n and listeners
 */
$("#html").innerText = chrome.i18n.getMessage("ashtml");
$("#html").addEventListener("click", makeHtml);
document.title = chrome.i18n.getMessage("name");
