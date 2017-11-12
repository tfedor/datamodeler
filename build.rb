require 'find'

result = "";

i = 0
Dir.glob("src/*").each do |file|
  next if (/\.js$/ =~ file).nil?

  puts file

  content = File.readlines(file)
  content = content.drop 1 unless result.empty?

  result += "/** #{file} */\n"
  result += content.join
end

Dir.glob("src/*/*").each do |file|
  next if (/\.js$/ =~ file).nil?

  puts file

  content = File.readlines(file)
  content = content.drop 1 unless result.empty?

  result += "/** #{file} */\n"
  result += content.join
end

File.write "dist/dbsdm.js", result

`uglifyjs dist/dbsdm.js -o dist/dbsdm.min.js -c hoist_vars=true,hoist_funs=true,dead_code=false`
