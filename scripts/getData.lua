local items = redis.call("smembers", KEYS[1])
for i=1,# items do
   local hits = tonumber(redis.call("get", "anl:" .. ARGV[2] .. ":" .. ARGV[1] .. ":" .. items[i]))
   table.insert(items, hits)
end
return items
