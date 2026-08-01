// Central view → route mapping used by the Navbar and every page's
// onViewChange handler.
//
// Views that now have their own dedicated pages route directly to them.
// The remaining legacy views (hollywood, bollywood, netflix, amazonprime,
// search) are still rendered on the home page via the ?view= query param.
export const VIEW_ROUTES: Record<string, string> = {
  home: '/',
  movies: '/movies',
  tv: '/tv',
  anime: '/anime',
};

export const getViewPath = (view: string): string =>
  VIEW_ROUTES[view] || `/?view=${view}`;
