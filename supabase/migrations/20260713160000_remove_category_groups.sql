-- Categories are now purely user-defined: the fixed Lyubishchev groups
-- (core/supportive/social/rest) are removed.

alter table public.categories drop column category_group;

drop type public.category_group;
