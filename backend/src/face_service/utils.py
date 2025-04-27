import unicodedata


def remove_diacritics_and_spaces(input_str):
    no_space = input_str.replace(" ", "")
    nfkd_form = unicodedata.normalize('NFKD', no_space)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])