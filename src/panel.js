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
 * @returns dom of tab item
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
 * Create all the dom for the tabs, by host
 * @param {*} hosts object of host key: tab array
 * @param {*} doc document object
 * @returns dom array of items
 */
function genHosts(hosts, doc){
    const generatedDOM = document.createElement("div");
    const multiHost = Object.keys(hosts).length > 1;
    for(let key in hosts){
        const oneHost = doc.createElement("div");
        oneHost.className = multiHost ? "hosts" : "onehost";
        if(multiHost && key!=="other"){
            oneHost.appendChild(genTitle(key, doc, 4));
        }
        const sorted = hosts[key].sort((a, b) => a.index - b.index);
        sorted.forEach(tab => {
            oneHost.appendChild(generateTabItem(tab, doc));
        });
        generatedDOM.appendChild(oneHost);
    }
    return generatedDOM;
}

/**
 * Create all the dom for hosts, by stack
 * @param {*} stacks object of stack string: host object
 * @param {*} doc document object
 * @returns dom array of items
 */
function genStacks(stacks, doc){
    const generatedDOM = document.createElement("div");
    const multiStack = Object.keys(stacks).length > 1;
    for(let key in stacks){
        const oneStack = doc.createElement("div");
        oneStack.className = multiStack ? "stacks" : "onestack";
        if(multiStack && key!=="none"){
            oneStack.appendChild(genTitle(chrome.i18n.getMessage("stacktext") + key, doc, 3));
        }
        oneStack.appendChild(genHosts(stacks[key], doc));
        generatedDOM.appendChild(oneStack);
    }
    return generatedDOM;
}

/**
 * Generate a header dom item, e.g. h2, h3, h4
 * @param {*} message What string to use
 * @param {*} doc document object
 * @param {*} depth int for styling
 * @returns header dom
 */
function genTitle(message, doc, depth){
    const header = doc.createElement("h"+depth);
    header.innerText = message;
    return header;
}

/**
 * Generate the dom for windows, by stack
 * @param {*} windows object of indow id: stack object
 * @param {*} doc document object
 * @returns dom array of items generated
 */
function genWindows(windows, doc){
    const generatedDOM = document.createElement("div");
    const multiWindow = Object.keys(windows).length > 1;
    for(let key in windows){
        const oneWindow = doc.createElement("div");
        oneWindow.className = multiWindow ? "windows" : "onewindow";
        if(multiWindow && key!=="all"){
            oneWindow.appendChild(genTitle(chrome.i18n.getMessage("windowtext") + key, doc, 2));
        }
        oneWindow.appendChild(genStacks(windows[key], doc));
        generatedDOM.appendChild(oneWindow);
    }
    return generatedDOM;
}

/**
 * Get html page with tab info
 * @param {*} tabs object nested according to window, stack, host, then array of tab
 * @returns document object of tab page
 */
function generateHtml(tabs){
    const tabPage = document.implementation.createHTMLDocument(getTitle());
    const encoding = tabPage.createElement("meta");
    encoding.charset = "utf-8";
    if($("#indent").checked){
        const style = tabPage.createElement("style");
        style.innerHTML = `
        .windows, .stacks, .hosts{
            border-left: 3px solid #eee;
        }
        .windows:hover, .stacks:hover, .hosts:hover{
            border-left: 3px solid #aaa;
        }
        .windows, .stacks, .hosts, p {
            margin-left: 6px;
            padding-left: 4px;
        }
        `;
        tabPage.head.appendChild(style);
    }
    tabPage.head.appendChild(encoding);
    tabPage.body.appendChild(genTitle(getTitle(), tabPage, 1));
    tabPage.body.appendChild(genWindows(tabs, tabPage));
    return tabPage;
}

/**
 * Organise tabs by stack (vivaldi only)
 * @param tabs Array of Tab
 * @return Objects {tab group string: Array of Tab}
 */
function organiseByStack(tabs){
    const allStacks = {
        none: []
    };
    tabs.forEach(tab => {
        if(!tab.extData){
            allStacks.none.push(tab);
        }
        try {
            const parsed = JSON.parse(tab.extData);
            if(parsed.group){
                if(allStacks[parsed.group]){
                    allStacks[parsed.group].push(tab);
                } else {
                    allStacks[parsed.group] = [tab];
                }
            } else {
                allStacks.none.push(tab);
            }
        } catch (e) {
            allStacks.none.push(tab);
        }
    });
    return allStacks;
}

/**
 * Organise tabs by host
 * @param tabs Array of Tab
 * @return Objects {host string: Array of Tab}
 */
function organiseByHost(tabs){
    const allHosts = {
        other: []
    };
    tabs.forEach(tab => {
        try{
            const host = new URL(tab.url).host;
            if(host === ""){
                allHosts.other.push(tab);
            } else if(allHosts[host]){
                allHosts[host].push(tab);
            } else {
                allHosts[host] = [tab];
            }
        } catch (e) {
            allHosts.other.push(tab);
        }
    });
    return allHosts;
}

/**
 * Organise tabs by window
 * @param tabs Array of Tab
 * @return Objects of window id: Array of Tab
 */
function organiseByWindow(tabs){
    const allWindows = {};
    tabs.forEach(tab => {
        if(allWindows[tab.windowId]){
            allWindows[tab.windowId].push(tab);
        } else {
            allWindows[tab.windowId] = [tab];
        }
    });
    return allWindows;
}


/**
 * Determine if hosts are required, and organise accordingly
 * @param stacks object of window: stack : [tab]
 * @returns object of window: stack: host: [tab]
 */
function doHosts(stacks){
    const hostSortOuter = {};
    for(let outerKey in stacks){
        let hostSortInner = {};
        for(let innerKey in stacks[outerKey]){
            if($("#host").checked){
                hostSortInner[innerKey] = organiseByHost(stacks[outerKey][innerKey]);
            } else {
                hostSortInner[innerKey] = {all: stacks[outerKey][innerKey]};
            }
        }
        hostSortOuter[outerKey] = hostSortInner;
    }
    return hostSortOuter;
}

/**
 * Determine if stacks are required, and organise accordingly
 * @param windows object of tabs organised by window
 * @returns object of window: stack: [tab]
 */
function doStacks(windows){
    const stackSort = {};
    for(let key in windows){
        if($("#stack").checked){
            stackSort[key] = organiseByStack(windows[key]);
        } else {
            stackSort[key] = {none: windows[key]};
        }
    }
    return stackSort;
}

/**
 * Determine if windows are required, and organise accordingly
 * @param tabs array of tabs
 * @returns object of window: [tab]
 */
function doWindows(tabs){
    if($("#window").checked){
        return organiseByWindow(tabs);
    } else {
       return {all: tabs};
    }
}

/**
 * Present the html page for download
 * @param page document object
 */
function presentPage(page){
    const htmlfile = new File(
        [`<!DOCTYPE html>` + page.documentElement.innerHTML],
        getTitle()+".html",
        {type: "text/html"}
    );
    const blob = window.URL.createObjectURL(htmlfile);
    chrome.tabs.create({url: blob});
}

/**
 * Make and download the HTML page
 */
function makeHtml(){
    chrome.tabs.query({}, tabs => {
        let organisedTabs = doWindows(tabs);
        organisedTabs = doStacks(organisedTabs);
        organisedTabs = doHosts(organisedTabs);
        const page = generateHtml(organisedTabs);
        presentPage(page);
    });
}

/**
 * Something was clicked, update storage
 */
function checkClick(){
    chrome.storage.sync.set({
        host: $("#host").checked,
        window: $("#window").checked,
        stack: $("#stack").checked,
        style: $("#indent").checked
    });
}

/**
 * Init page i18n and listeners
 * @param savedPrefs from storage
 */
function init(savedPrefs){
    $("#html").innerText = chrome.i18n.getMessage("ashtml");
    $("#html").addEventListener("click", makeHtml);
    $("#host + span").innerText = chrome.i18n.getMessage("host");
    $("#window + span").innerText = chrome.i18n.getMessage("window");
    $("#stack + span").innerText = chrome.i18n.getMessage("stack");
    $("#indent + span").innerText = chrome.i18n.getMessage("indent");

    $("#host").checked = savedPrefs.host;
    $("#window").checked = savedPrefs.window;
    $("#stack").checked = savedPrefs.stack;
    $("#indent").checked = savedPrefs.style;

    $("#host").addEventListener("input", checkClick);
    $("#window").addEventListener("input", checkClick);
    $("#stack").addEventListener("input", checkClick);
    $("#indent").addEventListener("input", checkClick);

    if(navigator.userAgent.toLowerCase().indexOf("vivaldi") === -1){
        $("#vivaldi").innerHTML = chrome.i18n.getMessage("vivaldionly");
        $("#stack").checked = false;
        $("#stack").disabled = true;
    }

    document.title = chrome.i18n.getMessage("name");
}

chrome.storage.sync.get({
    host: false,
    window: false,
    stack: false,
    style: false
}, init);
