local pages = redis.call("keys", "anl:" .. ARGV[1] .. ":*:total")
local pagetable = {}
for i=1,# pages do
  local prefixlen = string.len("anl: " .. ARGV[1] .. ":")
  local postfixlen = string.len(":total") + 1
  local pagekey = string.sub(pages[i], 1, -1 * postfixlen) .. ":time:" .. ARGV[2] .. "*"
  table.insert(pagetable, string.sub(pages[i], prefixlen, -1 * postfixlen))
  local keys = redis.call("keys", pagekey)
  local total = 0
  for j=1,# keys do
    local hits = tonumber(redis.call("get", keys[j]))
    total = total + hits
  end
  table.insert(pagetable, total)
end
return pagetable
