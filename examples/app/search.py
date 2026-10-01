from openfeature import api

client = api.get_client()


def search(tenant, query):
    if client.get_boolean_value("faster-search", False):
        return fast_search(tenant, query)
    if client.get_boolean_value("search-suggestions", False):
        return suggest(tenant, query)
    return slow_search(tenant, query)


def fast_search(tenant, query):
    return []


def suggest(tenant, query):
    return []


def slow_search(tenant, query):
    return []
