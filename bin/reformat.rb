#!/usr/bin/env ruby

readme_path = ARGV[0] || File.expand_path(File.join(File.dirname(__FILE__), '..', 'README.md'))
readme = File.read(readme_path)

state = nil

markers = {
  "<!-- Start TOC (do not remove me) -->"   => -> { state = :toc },
  "<!-- End TOC (do not remove me) -->"     => -> { state = nil },
  "<!-- Start Links (do not remove me) -->" => -> { state = :links },
  "<!-- End Links (do not remove me) -->"   => -> { state = nil }
}

rewritten_readme = []
sections = []

# Simplistic parsing for our limited use-case.
readme.each_line do |line|
  if markers[line.strip]
    rewritten_readme << line
    rewritten_readme << markers[line.strip].()
  elsif state == :toc
    # Nothing to do - we'll regenerate this.
  elsif state == :links
      if line =~ /^\s*#/
        header_depth = line[/^\s*(#+)/, 1].length
        header = line[/^\s*#+\s*(.*?)$/, 1]

        parent_section = sections.reverse.find { |section| section[:depth] < header_depth }
        sort_header = "#{parent_section && parent_section[:sort_header]}-#{header}"

        sections << { depth: header_depth, header: header, sort_header: sort_header, links: [] }
      elsif line =~ /^\s*\*/
        sections.last[:links] << line.strip
      end
  else
    rewritten_readme << line
  end
end

sections.sort_by! { |section| section[:sort_header].downcase }

File.open(readme_path, 'w') do |f|
  rewritten_readme.each do |line|
    if line == :toc
      f.puts
      sections.each do |section|
        f.puts "#{'  ' * (section[:depth] - 2)}* [#{section[:header]}](##{section[:header].downcase(:ascii).gsub(/[^\p{Word}\- ]/u, '').tr(' ', '-')})"
      end
      f.puts
    elsif line == :links
      f.puts
      sections.each do |section|
        f.puts
        f.puts(('#' * section[:depth]) + ' ' + section[:header])
        if section[:links].length > 0
          f.puts
          section[:links].sort_by { |i| i.downcase }.uniq.each do |link|
            f.puts link
          end
        end
      end
      f.puts
    else
      f.puts line
    end
  end
end
