"""
Dynamic data generators.
"""
import random
import string
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()

GENERATORS = {
    "random_email": lambda: fake.email(),
    "random_phone": lambda: fake.phone_number(),
    "random_name": lambda: fake.name(),
    "random_first_name": lambda: fake.first_name(),
    "random_last_name": lambda: fake.last_name(),
    "random_company": lambda: fake.company(),
    "random_address": lambda: fake.address(),
    "random_city": lambda: fake.city(),
    "random_text": lambda: fake.text(max_nb_chars=100),
    "random_number": lambda: str(random.randint(1, 99999)),
    "random_string": lambda: "".join(random.choices(string.ascii_letters, k=10)),
    "current_date": lambda: datetime.now().strftime("%Y-%m-%d"),
    "current_datetime": lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "future_date": lambda: (datetime.now() + timedelta(days=random.randint(1, 365))).strftime("%Y-%m-%d"),
    "past_date": lambda: (datetime.now() - timedelta(days=random.randint(1, 365))).strftime("%Y-%m-%d"),
    "uuid": lambda: str(fake.uuid4()),
}


def generate_value(generator_name: str) -> str:
    """Generate a dynamic value using the named generator."""
    gen = GENERATORS.get(generator_name)
    if gen:
        return gen()
    raise ValueError(f"Unknown generator: {generator_name}")


def list_generators():
    """Return available generator names."""
    return list(GENERATORS.keys())
