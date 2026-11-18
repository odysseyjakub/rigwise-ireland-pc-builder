import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = name => readFile(new URL("../" + name, import.meta.url), "utf8");
const policyPages = ["privacy.html", "cookies.html", "terms.html", "affiliate.html", "contact.html"];

test("the homepage links to a privacy and legal section without remote Google Font requests", async () => {
  const html = await read("index.html");
  assert.match(html, /href="privacy\.html"/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(html, /id="clear-local-data"/);
});

test("all required policy pages exist and provide navigation between them", async () => {
  for (const page of policyPages) {
    const html = await read(page);
    assert.match(html, /<html lang="en-IE">/);
    for (const destination of policyPages) assert.ok(html.includes('href="' + destination + '"'), page + " should link to " + destination);
  }
});

test("privacy and storage pages state the browser-local data model and launch gaps", async () => {
  const privacy = await read("privacy.html");
  const cookies = await read("cookies.html");
  const contact = await read("contact.html");
  assert.match(privacy, /rigwise-local-account-id-v1/);
  assert.match(privacy, /does not upload the file/i);
  assert.match(privacy, /operator has not supplied the controller identity or contact details/i);
  assert.match(cookies, /has not been reviewed for cookie or device-storage consent/i);
  assert.match(contact, /No customer-support or privacy-contact address has been configured/i);
  assert.match(privacy, /Overpass service/i);
  assert.match(privacy, /selected county is sent/i);
  assert.match(privacy, /does not send your local account ID, exact address or device location/i);
});

test("mapped-shop lookup explains its source and limitations in the site UI", async () => {
  const html = await read("index.html");
  assert.match(html, /id="find-local-shops"/);
  assert.match(html, /OpenStreetMap contributors/);
  assert.match(html, /stock and collection directly/);
});
