local pages = redis.call("keys", "anl:".. ARGV[1] .. ":*:total")
local pagetable= {}
for i=1,# pages do
local prefixlen = string.len("anl: " .. ARGV[1] .. ":")
local postfixlen = string.len(":total") + 1
local page = string.sub(pages[i], prefixlen, -1 * postfixlen)
  table.insert(pagetable, page)
end
for i=1,# pages do
local hits = tonumber(redis.call("get", pages[i]))
  table.insert(pagetable, hits)
end
return pagetable
