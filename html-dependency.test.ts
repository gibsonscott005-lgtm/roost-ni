import {expect,test} from "bun:test";
import {load} from "cheerio";
import {render} from "@react-email/render";
import {createElement} from "react";

test("the source reader decodes HTML entities through its compatible parser",()=>{
  expect(load("<main><p>Landlord &amp; tenant &#163;900</p></main>")("main").text()).toBe("Landlord & tenant £900");
});
test("email plain-text rendering still decodes entities with its legacy dependency",async()=>{
  const text=await render(createElement("p",null,"Landlord & tenant £900"),{plainText:true});
  expect(text.trim()).toBe("Landlord & tenant £900");
});