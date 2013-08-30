local items = redis.call("smembers", KEYS[1])
for i=1,# items do
   local keys = redis.call("keys", "anl:" .. ARGV[2] .. ":" .. ARGV[1] .. ":" .. items[i] .. ":time:" .. ARGV[3] .. "*")
   local total = 0
   for j=1,# keys do
      local hits = tonumber(redis.call("get", keys[j]))
      total = total + hits
   end
   table.insert(items, total)
end
return items
